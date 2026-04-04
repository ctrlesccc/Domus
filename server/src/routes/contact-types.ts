import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { referenceSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const contactTypesRouter = Router();

contactTypesRouter.use(requireAuth);

contactTypesRouter.get("/", async (_request, response) => {
  const items = await prisma.contactType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return response.json(items);
});

contactTypesRouter.post("/", async (request, response) => {
  const input = referenceSchema.parse(request.body);
  const item = await prisma.contactType.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      category: input.category ?? "BOTH",
    },
  });
  await writeAuditLog({ entityType: "contact-type", entityId: item.id, action: "create", newValue: input });
  return response.status(201).json(item);
});

contactTypesRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = referenceSchema.parse(request.body);
  const existing = await prisma.contactType.findUnique({ where: { id } });
  const item = await prisma.contactType.update({
    where: { id },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      category: input.category ?? "BOTH",
    },
  });
  await writeAuditLog({ entityType: "contact-type", entityId: item.id, action: "update", oldValue: existing, newValue: input });
  return response.json(item);
});

contactTypesRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.contactType.findUnique({ where: { id } });
  const usage = await prisma.contact.count({ where: { contactTypeId: id } });
  if (usage > 0) {
    return response.status(409).json({ message: "Contact type is still in use." });
  }

  await prisma.contactType.delete({ where: { id } });
  await writeAuditLog({ entityType: "contact-type", entityId: id, action: "delete", oldValue: existing });
  return response.status(204).send();
});
