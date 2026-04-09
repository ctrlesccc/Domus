import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { ImportStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { analyzeImportDocument } from "../lib/import-analysis.js";
import { config } from "../config.js";
import { syncImportFolder } from "../lib/import-watcher.js";
import { assertUploadIsAllowed, persistImportedFile, persistImportUpload } from "../lib/storage.js";
import { documentSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const importsRouter = Router();
const upload = multer({
  dest: path.resolve(config.storageRoot, "..", "tmp"),
});

importsRouter.use(requireAuth);

importsRouter.get("/", async (_request, response) => {
  await syncImportFolder();
  const items = await prisma.importDocument.findMany({
    where: {
      status: { in: [ImportStatus.PENDING, ImportStatus.ERROR] },
    },
    orderBy: { discoveredAt: "desc" },
  });

  return response.json(
    items.map((item) => ({
      ...item,
      analysis: {
        confidence: {
          title: item.draftTitle ? (item.ocrStatus === "SUCCESS" ? 0.9 : 0.55) : 0,
          documentType: item.draftDocumentTypeId ? 0.78 : 0,
          contact: item.draftContactId ? 0.74 : 0,
          documentDate: item.draftDocumentDate ? 0.66 : 0,
          expiryDate: item.draftExpiryDate ? 0.56 : 0,
          overall:
            [
              item.draftTitle ? (item.ocrStatus === "SUCCESS" ? 0.9 : 0.55) : 0,
              item.draftDocumentTypeId ? 0.78 : 0,
              item.draftContactId ? 0.74 : 0,
              item.draftDocumentDate ? 0.66 : 0,
              item.draftExpiryDate ? 0.56 : 0,
            ].reduce((sum, value) => sum + value, 0) / 5,
        },
        warnings: [
          ...(item.ocrStatus === "ERROR" ? ["OCR-analyse is mislukt; controleer metadata handmatig."] : []),
          ...(item.ocrStatus === "UNSUPPORTED" ? ["Dit bestandstype ondersteunt geen OCR-prefill."] : []),
          ...(!item.draftDocumentTypeId ? ["Documentsoort kon niet zeker worden herkend."] : []),
          ...(!item.draftContactId ? ["Contact kon niet automatisch worden gekoppeld."] : []),
          ...(!item.draftDocumentDate ? ["Documentdatum ontbreekt of kon niet worden herkend."] : []),
        ],
      },
      previewUrl: `/api/imports/${item.id}/preview`,
      downloadUrl: `/api/imports/${item.id}/download`,
    })),
  );
});

importsRouter.post("/sync", async (_request, response) => {
  await syncImportFolder();
  return response.json({ success: true });
});

importsRouter.post("/upload", upload.single("file"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ message: "Bestand is verplicht." });
  }

  try {
    assertUploadIsAllowed(request.file);
    const persisted = await persistImportUpload(request.file);

    const item = await prisma.importDocument.create({
      data: {
        originalFilename: request.file.originalname,
        sourcePath: persisted.sourcePath,
        mimeType: request.file.mimetype,
        fileSize: request.file.size,
        status: "PENDING",
        ocrStatus: "PENDING",
        errorMessage: null,
      },
    });

    await analyzeImportDocument({
      id: item.id,
      sourcePath: persisted.sourcePath,
      mimeType: request.file.mimetype,
      originalFilename: request.file.originalname,
    });

    await writeAuditLog({
      entityType: "import-document",
      entityId: item.id,
      action: "upload",
      ...auditActorFromRequest(request),
      newValue: {
        originalFilename: request.file.originalname,
        mimeType: request.file.mimetype,
        fileSize: request.file.size,
      },
    });

    return response.status(201).json({ id: item.id });
  } catch (error) {
    await fs.rm(request.file.path, { force: true }).catch(() => undefined);
    throw error;
  }
});

importsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const item = await prisma.importDocument.findUnique({ where: { id } });

  if (!item) {
    return response.status(404).json({ message: "Importitem niet gevonden." });
  }

  if (item.status === "IMPORTED") {
    return response.status(409).json({ message: "Verwerkte importitems kunnen niet meer uit de queue worden verwijderd." });
  }

  await fs.rm(item.sourcePath, { force: true }).catch(() => undefined);
  await prisma.importDocument.delete({ where: { id } });

  await writeAuditLog({
    entityType: "import-document",
    entityId: id,
    action: "delete",
    ...auditActorFromRequest(request),
    oldValue: item,
    newValue: { deleted: true },
  });

  return response.status(204).send();
});

importsRouter.post("/:id/finalize", async (request, response) => {
  const id = Number(request.params.id);
  const input = documentSchema.parse({ ...request.body, createNewVersion: false });
  const item = await prisma.importDocument.findUnique({ where: { id } });

  if (!item) {
    return response.status(404).json({ message: "Importitem niet gevonden." });
  }

  if (item.status === "IMPORTED") {
    return response.status(409).json({ message: "Importitem is al verwerkt." });
  }

  const persisted = await persistImportedFile(item.sourcePath, item.originalFilename);
  const primaryContactId = input.contactId ?? input.contactIds[0];
  const contactIds = [...new Set([...(input.contactIds ?? []), ...(primaryContactId ? [primaryContactId] : [])])];

  const document = await prisma.document.create({
    data: {
      title: input.title,
      originalFilename: item.originalFilename,
      storedFilename: persisted.storedFilename,
      storagePath: persisted.storagePath,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      expiryDate: input.expiryDate,
      documentDate: input.documentDate,
      status: input.status,
      notes: input.notes,
      dossierTopic: input.dossierTopic,
      versionGroup: crypto.randomUUID(),
      documentContacts: {
        create: contactIds.map((linkedContactId) => ({ contactId: linkedContactId })),
      },
      obligationDocuments: {
        create: input.obligationIds.map((obligationId) => ({ obligationId })),
      },
    },
  });

  await prisma.importDocument.update({
    where: { id },
    data: {
      status: "IMPORTED",
      errorMessage: null,
      importedAt: new Date(),
    },
  });

  await writeAuditLog({
    entityType: "import-document",
    entityId: id,
    action: "finalize",
    ...auditActorFromRequest(request),
    oldValue: item,
    newValue: {
      documentId: document.id,
      title: input.title,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      obligationIds: input.obligationIds,
    },
  });

  return response.status(201).json({ documentId: document.id });
});

importsRouter.get("/:id/download", async (request, response) => {
  const item = await prisma.importDocument.findUnique({ where: { id: Number(request.params.id) } });
  if (!item) {
    return response.status(404).json({ message: "Importitem niet gevonden." });
  }

  return response.download(item.sourcePath, item.originalFilename);
});

importsRouter.get("/:id/preview", async (request, response) => {
  const item = await prisma.importDocument.findUnique({ where: { id: Number(request.params.id) } });
  if (!item) {
    return response.status(404).json({ message: "Importitem niet gevonden." });
  }

  response.type(item.mimeType || "application/octet-stream");
  response.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(item.originalFilename)}"`);
  return response.sendFile(item.sourcePath);
});
