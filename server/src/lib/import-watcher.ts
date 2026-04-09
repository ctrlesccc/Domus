import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { ImportStatus, OcrStatus } from "@prisma/client";
import { config } from "../config.js";
import { analyzeImportDocument } from "./import-analysis.js";
import { prisma } from "./prisma.js";
import { ensureStorageDirectory, inferMimeTypeFromFilename, isMimeTypeAllowed } from "./storage.js";

let watcherStarted = false;
let queueRunning = false;
const queuedAnalyses = new Map<number, { id: number; sourcePath: string; mimeType: string; originalFilename: string }>();

async function processAnalysisQueue() {
  if (queueRunning) {
    return;
  }

  queueRunning = true;
  try {
    while (queuedAnalyses.size) {
      const next = queuedAnalyses.values().next().value;
      if (!next) {
        break;
      }

      queuedAnalyses.delete(next.id);
      await analyzeImportDocument(next);
    }
  } finally {
    queueRunning = false;
  }
}

export function queueImportAnalysis(input: { id: number; sourcePath: string; mimeType: string; originalFilename: string }) {
  queuedAnalyses.set(input.id, input);
  void processAnalysisQueue();
}

export async function resetAndQueueImportAnalysis(input: { id: number; sourcePath: string; mimeType: string; originalFilename: string }) {
  await prisma.importDocument.update({
    where: { id: input.id },
    data: {
      ocrStatus: isMimeTypeAllowed(input.mimeType) ? OcrStatus.PENDING : OcrStatus.UNSUPPORTED,
      errorMessage: null,
      ocrText: null,
      draftTitle: null,
      draftDocumentTypeId: null,
      draftContactId: null,
      draftDocumentDate: null,
      draftExpiryDate: null,
      draftNotes: null,
    },
  });

  if (isMimeTypeAllowed(input.mimeType)) {
    queueImportAnalysis(input);
  }
}

async function upsertImportFile(filePath: string) {
  const stats = await fsPromises.stat(filePath).catch(() => null);
  if (!stats?.isFile()) {
    return;
  }

  const originalFilename = path.basename(filePath);
  const mimeType = inferMimeTypeFromFilename(originalFilename);
  const supported = isMimeTypeAllowed(mimeType);
  const existing = await prisma.importDocument.findUnique({ where: { sourcePath: filePath } });

  if (!existing) {
    const created = await prisma.importDocument.create({
      data: {
        originalFilename,
        sourcePath: filePath,
        mimeType,
        fileSize: stats.size,
        status: supported ? ImportStatus.PENDING : ImportStatus.ERROR,
        ocrStatus: supported ? OcrStatus.PENDING : OcrStatus.UNSUPPORTED,
        errorMessage: supported ? null : "Niet ondersteund bestandstype.",
      },
    });

    if (supported) {
      queueImportAnalysis({
        id: created.id,
        sourcePath: filePath,
        mimeType,
        originalFilename,
      });
    }
    return;
  }

  const fileChanged = existing.fileSize !== stats.size || existing.mimeType !== mimeType || existing.originalFilename !== originalFilename;
  const needsSupportReset = !supported && existing.ocrStatus !== OcrStatus.UNSUPPORTED;

  if (!fileChanged && !needsSupportReset) {
    if (supported && existing.ocrStatus === OcrStatus.PENDING) {
      queueImportAnalysis({
        id: existing.id,
        sourcePath: filePath,
        mimeType,
        originalFilename,
      });
    }
    return;
  }

  await prisma.importDocument.update({
    where: { id: existing.id },
    data: {
      originalFilename,
      mimeType,
      fileSize: stats.size,
      status: supported ? ImportStatus.PENDING : ImportStatus.ERROR,
      ocrStatus: supported ? OcrStatus.PENDING : OcrStatus.UNSUPPORTED,
      errorMessage: supported ? null : "Niet ondersteund bestandstype.",
      ocrText: supported ? null : existing.ocrText,
      draftTitle: supported ? null : existing.draftTitle,
      draftDocumentTypeId: supported ? null : existing.draftDocumentTypeId,
      draftContactId: supported ? null : existing.draftContactId,
      draftDocumentDate: supported ? null : existing.draftDocumentDate,
      draftExpiryDate: supported ? null : existing.draftExpiryDate,
      draftNotes: supported ? null : existing.draftNotes,
    },
  });

  if (supported) {
    queueImportAnalysis({
      id: existing.id,
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
