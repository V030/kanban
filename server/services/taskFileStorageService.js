import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabase.js";

export const TASK_FILE_BUCKET = process.env.SUPABASE_TASK_FILES_BUCKET || process.env.SUPABASE_BUCKET || "task-files";
const SIGNED_URL_TTL_SECONDS = Number(process.env.TASK_FILE_SIGNED_URL_TTL_SECONDS || 60 * 60);

const VIEWABLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "video/mp4",
]);

const DOWNLOAD_ONLY_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const ALLOWED_MIME_TYPES = new Set([...VIEWABLE_MIME_TYPES, ...DOWNLOAD_ONLY_MIME_TYPES]);

function storageError(message, code, cause = null) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function sanitizeTaskFileName(name) {
  const ext = path.extname(String(name || ""));
  const base = path.basename(String(name || "attachment"), ext);
  const safeBase = base
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "attachment";
  const safeExt = ext.replace(/[^.\w-]/g, "").slice(0, 24);
  return `${safeBase}${safeExt}`.slice(0, 255);
}

export function validateTaskFile(file) {
  if (!file?.path) {
    throw storageError("File is required", "INVALID_FILE");
  }

  const mimeType = String(file.mimetype || "application/octet-stream").toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw storageError("This file type is not supported for task attachments", "INVALID_FILE_TYPE");
  }

  return mimeType;
}

function buildStoragePath({ taskId, createdBy, fileName }) {
  const safeName = sanitizeTaskFileName(fileName);
  const taskSegment = String(taskId).replace(/[^\w-]/g, "");
  const userSegment = String(createdBy).replace(/[^\w-]/g, "");
  return `tasks/${taskSegment}/${userSegment}/${Date.now()}-${randomUUID()}-${safeName}`;
}

export async function createTaskFileSignedUrl(storagePath, options = {}) {
  const pathValue = String(storagePath || "").trim();
  if (!pathValue) return "";

  const signedOptions = options.download ? { download: true } : undefined;
  const { data, error } = await supabase.storage
    .from(TASK_FILE_BUCKET)
    .createSignedUrl(pathValue, SIGNED_URL_TTL_SECONDS, signedOptions);

  if (error) {
    throw storageError("Unable to create file access URL", "FILE_URL_FAILED", error);
  }

  return data?.signedUrl || "";
}

export async function attachTaskFileUrls(file) {
  if (!file) return file;
  const url = await createTaskFileSignedUrl(file.storage_path);
  const downloadUrl = await createTaskFileSignedUrl(file.storage_path, { download: true });
  const { storage_path: _storagePath, ...publicFile } = file;
  return {
    ...publicFile,
    url,
    download_url: downloadUrl || url,
  };
}

export function toPublicTaskFile(file) {
  if (!file) return file;
  const { storage_path: _storagePath, ...publicFile } = file;
  return publicFile;
}

export async function attachTaskFilesUrls(files = []) {
  return Promise.all((Array.isArray(files) ? files : []).map(attachTaskFileUrls));
}

export async function uploadTaskFileToStorage(file, { taskId, createdBy, fileName }) {
  const mimeType = validateTaskFile(file);
  const safeName = sanitizeTaskFileName(fileName || file.originalname);
  const storagePath = buildStoragePath({ taskId, createdBy, fileName: safeName });
  const body = await fs.promises.readFile(file.path);

  const { error } = await supabase.storage
    .from(TASK_FILE_BUCKET)
    .upload(storagePath, body, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw storageError("Unable to upload file", "STORAGE_UPLOAD_FAILED", error);
  }

  return {
    storagePath,
    fileName: safeName,
    mimeType,
  };
}

export async function deleteTaskFileFromStorage(storagePath) {
  const pathValue = String(storagePath || "").trim();
  if (!pathValue) return;

  const { error } = await supabase.storage.from(TASK_FILE_BUCKET).remove([pathValue]);
  if (error) {
    throw storageError("Unable to delete file from storage", "STORAGE_DELETE_FAILED", error);
  }
}

export async function deleteTaskFilesFromStorage(files = []) {
  const paths = (Array.isArray(files) ? files : [])
    .map((file) => String(file?.storage_path || "").trim())
    .filter(Boolean);

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(TASK_FILE_BUCKET).remove(paths);
  if (error) {
    throw storageError("Unable to delete task files from storage", "STORAGE_DELETE_FAILED", error);
  }
}
