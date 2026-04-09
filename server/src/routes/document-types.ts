import { Router } from "express";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { referenceSchema } from "../lib/validators.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const documentTypesRouter = Router();

documentTypesRouter.use(requireAuth, requireAdmin);

documentTypesRouter.get("/", async (_request, response) => {
  const items = await prisma.documentType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return response.json(items);
});

documentTypesRouter.post("/", async (request, response) => {
  const input = referenceSchema.parse(request.body);
  const item = await prisma.documentType.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ entityType: "document-type", entityId: item.id, action: "create", ...auditActorFromRequest(request), newValue: input });
  return response.status(201).json(item);
});

documentTypesRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = referenceSchema.parse(request.body);
  const existing = await prisma.documentType.findUnique({ where: { id } });
  const item = await prisma.documentType.update({
    where: { id },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ entityType: "document-type", entityId: item.id, action: "update", ...auditActorFromRequest(request), oldValue: existing, newValue: input });
  return response.json(item);
});

documentTypesRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.documentType.findUnique({ where: { id } });
  const usage = await prisma.document.count({ where: { documentTypeId: id } });
  if (usage > 0) {
    return response.status(409).json({ message: "Document type is still in use." });
  }

  await prisma.documentType.delete({ where: { id } });
  await writeAuditLog({ entityType: "document-type", entityId: id, action: "delete", ...auditActorFromRequest(request), oldValue: existing });
  return response.status(204).send();
});
