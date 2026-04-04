import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { config } from "../config.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const mimeTypesByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
};

export async function ensureStorageDirectory() {
  await fs.mkdir(config.storageRoot, { recursive: true });
  await fs.mkdir(config.importRoot, { recursive: true });
  await fs.mkdir(path.resolve(config.storageRoot, "..", "..", "tmp"), { recursive: true });
}

export function assertUploadIsAllowed(file: Express.Multer.File) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new Error("Unsupported file type.");
  }

  const maxSizeInBytes = config.maxUploadSizeMb * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`File exceeds maximum size of ${config.maxUploadSizeMb} MB.`);
  }
}

export async function persistUpload(file: Express.Multer.File) {
  await ensureStorageDirectory();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const destinationDir = path.join(config.storageRoot, year, month);
  await fs.mkdir(destinationDir, { recursive: true });

  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storedFilename = `${crypto.randomUUID()}-${sanitizedOriginalName}`;
  const targetPath = path.join(destinationDir, storedFilename);

  await fs.rename(file.path, targetPath);

  return {
    storedFilename,
    storagePath: targetPath,
  };
}

export async function deleteStoredFile(storagePath: string) {
  await fs.rm(storagePath, { force: true });
}

export function inferMimeTypeFromFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return mimeTypesByExtension[extension] ?? "application/octet-stream";
}

export function isMimeTypeAllowed(mimeType: string) {
  return allowedMimeTypes.has(mimeType);
}

export async function persistImportedFile(sourcePath: string, originalFilename: string) {
  await ensureStorageDirectory();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const destinationDir = path.join(config.storageRoot, year, month);
  await fs.mkdir(destinationDir, { recursive: true });

  const sanitizedOriginalName = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storedFilename = `${crypto.randomUUID()}-${sanitizedOriginalName}`;
  const targetPath = path.join(destinationDir, storedFilename);

  await fs.rename(sourcePath, targetPath);

  return {
    storedFilename,
    storagePath: targetPath,
  };
}
