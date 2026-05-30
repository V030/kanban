import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(os.tmpdir(), "kanban-task-uploads");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const maxFileSize = Number(process.env.TASK_FILE_MAX_BYTES || 25 * 1024 * 1024);

fs.mkdirSync(uploadDir, { recursive: true });

function sanitizeUploadName(name) {
  return String(name || "attachment")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "attachment";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "attachment", ext);
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${sanitizeUploadName(base)}${ext}`);
  },
});

export const uploadTaskFile = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single("file");

export function cleanupUploadedFile(file) {
  if (!file?.path) return;
  fs.promises.unlink(file.path).catch(() => {});
}
