import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { ImportStatus, OcrStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { config } from "../config.js";
import { ensureStorageDirectory, inferMimeTypeFromFilename, isMimeTypeAllowed } from "./storage.js";
import { analyzeImportDocument } from "./import-analysis.js";

let watcherStarted = false;

async function upsertImportFile(filePath: string) {
  const stats = await fsPromises.stat(filePath).catch(() => null);
  if (!stats?.isFile()) {
    return;
  }

  const originalFilename = path.basename(filePath);
  const mimeType = inferMimeTypeFromFilename(originalFilename);

  const item = await prisma.importDocument.upsert({
    where: { sourcePath: filePath },
    update: {
      originalFilename,
      mimeType,
      fileSize: stats.size,
      status: isMimeTypeAllowed(mimeType) ? ImportStatus.PENDING : ImportStatus.ERROR,
      ocrStatus: isMimeTypeAllowed(mimeType) ? OcrStatus.PENDING : OcrStatus.UNSUPPORTED,
      errorMessage: isMimeTypeAllowed(mimeType) ? null : "Niet ondersteund bestandstype.",
    },
    create: {
      originalFilename,
      sourcePath: filePath,
      mimeType,
      fileSize: stats.size,
      status: isMimeTypeAllowed(mimeType) ? ImportStatus.PENDING : ImportStatus.ERROR,
      ocrStatus: isMimeTypeAllowed(mimeType) ? OcrStatus.PENDING : OcrStatus.UNSUPPORTED,
      errorMessage: isMimeTypeAllowed(mimeType) ? null : "Niet ondersteund bestandstype.",
    },
  });

  if (isMimeTypeAllowed(mimeType)) {
    await analyzeImportDocument({
      id: item.id,
      sourcePath: filePath,
      mimeType,
      originalFilename,
    });
  }
}

export async function syncImportFolder() {
  await ensureStorageDirectory();
  const entries = await fsPromises.readdir(config.importRoot, { withFileTypes: true }).catch(() => []);
  const filePaths = entries.filter((entry) => entry.isFile()).map((entry) => path.join(config.importRoot, entry.name));

  await Promise.all(filePaths.map((filePath) => upsertImportFile(filePath)));

  const knownPending = await prisma.importDocument.findMany({
    where: {
      status: { in: [ImportStatus.PENDING, ImportStatus.ERROR] },
    },
  });

  await Promise.all(
    knownPending.map(async (item) => {
      const exists = await fsPromises.stat(item.sourcePath).then(() => true).catch(() => false);
      if (!exists && item.status !== "IMPORTED") {
        await prisma.importDocument.update({
          where: { id: item.id },
          data: {
            status: "ERROR",
            errorMessage: item.importedAt ? item.errorMessage : "Bestand niet meer aanwezig in importmap.",
          },
        });
      }
    }),
  );
}

export async function startImportWatcher() {
  if (watcherStarted) {
    return;
  }

  watcherStarted = true;
  await syncImportFolder();

  fs.watch(config.importRoot, { persistent: false }, () => {
    syncImportFolder().catch((error) => {
      console.error("Import watcher sync failed", error);
    });
  });
}
