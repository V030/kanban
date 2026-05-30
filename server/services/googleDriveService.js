import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_TASK_FILES_FOLDER_ID || "1gAb3PIFs_RxCoHxtIbZTSPX1GiJzWIkb";
const DEFAULT_KEY_PATH = path.resolve(__dirname, "../../credentials/miruban-791f6968979b.json");
const KEY_FILE_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : DEFAULT_KEY_PATH;

let driveClient;

function getDriveClient() {
  if (driveClient) return driveClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

function getUserDriveClient(refreshToken) {
  const token = String(refreshToken || "").trim();
  if (!token) {
    const error = new Error("Google Drive connection required. Sign in with Google and grant Drive access to upload files.");
    error.code = "GOOGLE_DRIVE_AUTH_REQUIRED";
    throw error;
  }

  const auth = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "postmessage"
  );
  auth.setCredentials({ refresh_token: token });

  return google.drive({ version: "v3", auth });
}

export function getFileUrl(driveFileId) {
  const id = String(driveFileId || "").trim();
  if (!id) return "";
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

export function getPreviewUrl(driveFileId) {
  const id = String(driveFileId || "").trim();
  if (!id) return "";
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
}

export async function uploadFile(file, options = {}) {
  if (!file?.path) {
    const error = new Error("File is required");
    error.code = "INVALID_FILE";
    throw error;
  }

  const drive = options.refreshToken ? getUserDriveClient(options.refreshToken) : getDriveClient();
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: file.originalname,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: file.mimetype || "application/octet-stream",
      body: fs.createReadStream(file.path),
    },
    fields: "id, webViewLink, webContentLink",
  });

  const driveFileId = response.data?.id;
  if (!driveFileId) {
    const error = new Error("Google Drive did not return a file id");
    error.code = "DRIVE_UPLOAD_FAILED";
    throw error;
  }

  await drive.permissions.create({
    fileId: driveFileId,
    supportsAllDrives: true,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    driveFileId,
    url: getFileUrl(driveFileId),
    previewUrl: getPreviewUrl(driveFileId),
  };
}

export async function deleteFile(driveFileId, options = {}) {
  const id = String(driveFileId || "").trim();
  if (!id) return;

  const drive = options.refreshToken ? getUserDriveClient(options.refreshToken) : getDriveClient();
  try {
    await drive.files.delete({ fileId: id, supportsAllDrives: true });
  } catch (error) {
    if (error?.code === 404 || error?.response?.status === 404) return;
    throw error;
  }
}
