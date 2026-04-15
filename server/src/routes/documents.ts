import { Router } from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { serializeDocument } from "../lib/serializers.js";
import { assertUploadIsAllowed, deleteStoredFile, persistUpload } from "../lib/storage.js";
import { documentSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  dest: path.resolve(process.cwd(), "..", "storage", "tmp"),
});

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

function buildDocumentIncludes() {
  return {
    documentType: true,
    contact: true,
    documentContacts: {
      include: {
        contact: true,
      },
    },
    obligationDocuments: {
      include: {
        obligation: true,
      },
    },
  } as const;
}

documentsRouter.get("/", async (request, response) => {
  const q = String(request.query.q ?? "").trim();
  const status = request.query.status ? String(request.query.status) : undefined;
  const documentTypeId = request.query.documentTypeId ? Number(request.query.documentTypeId) : undefined;
  const contactId = request.query.contactId ? Number(request.query.contactId) : undefined;
  const expiryBefore = request.query.expiryBefore ? new Date(String(request.query.expiryBefore)) : undefined;
  const includeDeleted = request.query.includeDeleted === "true";
  const latestOnly = request.query.latestOnly !== "false";

  const items = await prisma.document.findMany({
    where: {
      deletedAt: includeDeleted ? undefined : null,
      isLatestVersion: latestOnly ? true : undefined,
      status: status as never,
      documentTypeId,
      AND: [
        contactId
          ? {
              OR: [{ contactId }, { documentContacts: { some: { contactId } } }],
            }
          : {},
        q
          ? {
              OR: [
                { title: { contains: q } },
                { originalFilename: { contains: q } },
                { notes: { contains: q } },
                { documentContacts: { some: { contact: { name: { contains: q } } } } },
              ],
            }
          : {},
      ],
      expiryDate: expiryBefore ? { lte: expiryBefore } : undefined,
    },
    include: buildDocumentIncludes(),
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
  });

  return response.json(items.map(serializeDocument));
});

documentsRouter.get("/:id", async (request, response) => {
  const item = await prisma.document.findUnique({
    where: { id: Number(request.params.id) },
    include: buildDocumentIncludes(),
  });

  if (!item || item.deletedAt) {
    return response.status(404).json({ message: "Document not found." });
  }

  const versionHistory = await prisma.document.findMany({
    where: {
      versionGroup: item.versionGroup,
      deletedAt: null,
    },
    include: buildDocumentIncludes(),
    orderBy: { versionNumber: "desc" },
  });

  return response.json({
    ...serializeDocument(item),
    versionHistory: versionHistory.map(serializeDocument),
  });
});

documentsRouter.post("/", upload.single("file"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ message: "File is required." });
  }

  const input = documentSchema.parse(request.body);
  assertUploadIsAllowed(request.file);
  const persisted = await persistUpload(request.file);
  const primaryContactId = input.contactId ?? input.contactIds[0];
  const contactIds = [...new Set([...(input.contactIds ?? []), ...(primaryContactId ? [primaryContactId] : [])])];

  const item = await prisma.document.create({
    data: {
      title: input.title,
      originalFilename: request.file.originalname,
      storedFilename: persisted.storedFilename,
      storagePath: persisted.storagePath,
      mimeType: request.file.mimetype,
      fileSize: request.file.size,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      expiryDate: input.expiryDate,
      documentDate: input.documentDate,
      isImportant: input.isImportant,
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
    include: buildDocumentIncludes(),
  });

  await writeAuditLog({
    entityType: "document",
    entityId: item.id,
    action: "create",
    ...auditActorFromRequest(request),
    newValue: {
      title: input.title,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      contactIds,
      obligationIds: input.obligationIds,
      status: input.status,
      isImportant: input.isImportant,
    },
  });
  return response.status(201).json(serializeDocument(item));
});

documentsRouter.put("/:id", upload.single("file"), async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    if (request.file) {
      await fs.rm(request.file.path, { force: true });
    }
    return response.status(404).json({ message: "Document not found." });
  }

  const input = documentSchema.parse(request.body);
  const primaryContactId = input.contactId ?? input.contactIds[0];
  const contactIds = [...new Set([...(input.contactIds ?? []), ...(primaryContactId ? [primaryContactId] : [])])];

  if (request.file && input.createNewVersion) {
    assertUploadIsAllowed(request.file);
    const persisted = await persistUpload(request.file);
    const nextVersionNumber = existing.versionNumber + 1;

    await prisma.document.update({
      where: { id },
      data: {
        isLatestVersion: false,
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });

    const newVersion = await prisma.document.create({
      data: {
        title: input.title,
        originalFilename: request.file.originalname,
        storedFilename: persisted.storedFilename,
        storagePath: persisted.storagePath,
        mimeType: request.file.mimetype,
        fileSize: request.file.size,
        documentTypeId: input.documentTypeId,
        contactId: primaryContactId,
        expiryDate: input.expiryDate,
        documentDate: input.documentDate,
        isImportant: input.isImportant,
        status: input.status,
        notes: input.notes,
        dossierTopic: input.dossierTopic,
        versionGroup: existing.versionGroup,
        versionNumber: nextVersionNumber,
        previousVersionId: existing.id,
        isLatestVersion: true,
        documentContacts: {
          create: contactIds.map((linkedContactId) => ({ contactId: linkedContactId })),
        },
        obligationDocuments: {
          create: input.obligationIds.map((obligationId) => ({ obligationId })),
        },
      },
      include: buildDocumentIncludes(),
    });

    await writeAuditLog({
      entityType: "document",
      entityId: newVersion.id,
      action: "version_create",
      ...auditActorFromRequest(request),
      oldValue: existing,
      newValue: {
        title: input.title,
        documentTypeId: input.documentTypeId,
        contactId: primaryContactId,
        contactIds,
        obligationIds: input.obligationIds,
        status: input.status,
        isImportant: input.isImportant,
      },
    });
    return response.json(serializeDocument(newVersion));
  }

  let fileData = {
    originalFilename: existing.originalFilename,
    storedFilename: existing.storedFilename,
    storagePath: existing.storagePath,
    mimeType: existing.mimeType,
    fileSize: existing.fileSize,
  };

  if (request.file) {
    assertUploadIsAllowed(request.file);
    const persisted = await persistUpload(request.file);
    await deleteStoredFile(existing.storagePath);
    fileData = {
      originalFilename: request.file.originalname,
      storedFilename: persisted.storedFilename,
      storagePath: persisted.storagePath,
      mimeType: request.file.mimetype,
      fileSize: request.file.size,
    };
  }

  await prisma.obligationDocument.deleteMany({ where: { documentId: id } });
  await prisma.documentContact.deleteMany({ where: { documentId: id } });

  const item = await prisma.document.update({
    where: { id },
    data: {
      ...fileData,
      title: input.title,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      expiryDate: input.expiryDate,
      documentDate: input.documentDate,
      isImportant: input.isImportant,
      status: input.status,
      notes: input.notes,
      dossierTopic: input.dossierTopic,
      archivedAt: input.status === "ARCHIVED" ? existing.archivedAt ?? new Date() : null,
      documentContacts: {
        create: contactIds.map((linkedContactId) => ({ contactId: linkedContactId })),
      },
      obligationDocuments: {
        create: input.obligationIds.map((obligationId) => ({ obligationId })),
      },
    },
    include: buildDocumentIncludes(),
  });

  await writeAuditLog({
    entityType: "document",
    entityId: item.id,
    action: "update",
    ...auditActorFromRequest(request),
    oldValue: existing,
    newValue: {
      title: input.title,
      documentTypeId: input.documentTypeId,
      contactId: primaryContactId,
      contactIds,
      obligationIds: input.obligationIds,
      status: input.status,
      isImportant: input.isImportant,
    },
  });
  return response.json(serializeDocument(item));
});

documentsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const permanent = request.query.permanent === "true";
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) {
    return response.status(404).json({ message: "Document not found." });
  }

  if (permanent) {
    await prisma.document.delete({ where: { id } });
    await deleteStoredFile(existing.storagePath);
    await writeAuditLog({ entityType: "document", entityId: id, action: "delete_permanent", ...auditActorFromRequest(request), oldValue: existing });
    return response.status(204).send();
  }

  await prisma.document.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  await writeAuditLog({ entityType: "document", entityId: id, action: "delete", ...auditActorFromRequest(request), oldValue: existing });
  return response.status(204).send();
});

documentsRouter.get("/:id/download", async (request, response) => {
  const item = await prisma.document.findUnique({ where: { id: Number(request.params.id) } });
  if (!item || item.deletedAt) {
    return response.status(404).json({ message: "Document not found." });
  }

  return response.download(item.storagePath, item.originalFilename);
});

documentsRouter.get("/:id/preview", async (request, response) => {
  const item = await prisma.document.findUnique({ where: { id: Number(request.params.id) } });
  if (!item || item.deletedAt) {
    return response.status(404).json({ message: "Document not found." });
  }

  response.type(item.mimeType || "application/octet-stream");
  response.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(item.originalFilename)}"`);
  response.setHeader("X-Content-Type-Options", "nosniff");

  return response.sendFile(item.storagePath);
});
