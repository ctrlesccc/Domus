import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { serializeContact } from "../lib/serializers.js";
import { contactSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", async (request, response) => {
  const q = String(request.query.q ?? "").trim();
  const kind = request.query.kind === "PERSONAL" ? "PERSONAL" : request.query.kind === "BUSINESS" ? "BUSINESS" : undefined;
  const contactTypeId = request.query.contactTypeId ? Number(request.query.contactTypeId) : undefined;
  const isActive = request.query.isActive === "true" ? true : request.query.isActive === "false" ? false : undefined;

  const items = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      kind,
      contactTypeId,
      isActive,
      OR: q
        ? [
            { name: { contains: q } },
            { city: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ]
        : undefined,
    },
    include: {
      contactType: true,
    },
    orderBy: [{ name: "asc" }],
  });

  return response.json(items.map(serializeContact));
});

contactsRouter.get("/:id", async (request, response) => {
  const item = await prisma.contact.findUnique({
    where: { id: Number(request.params.id) },
    include: {
      contactType: true,
      documents: true,
      obligations: true,
    },
  });

  if (!item) {
    return response.status(404).json({ message: "Contact not found." });
  }

  if (item.deletedAt) {
    return response.status(404).json({ message: "Contact not found." });
  }

  return response.json({
    ...serializeContact(item),
    documentCount: item.documents.length,
    obligationCount: item.obligations.length,
  });
});

contactsRouter.post("/", async (request, response) => {
  const input = contactSchema.parse(request.body);
  const item = await prisma.contact.create({
    data: input,
    include: { contactType: true },
  });
  await writeAuditLog({ entityType: "contact", entityId: item.id, action: "create", newValue: input });
  return response.status(201).json(serializeContact(item));
});

contactsRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = contactSchema.parse(request.body);
  const existing = await prisma.contact.findUnique({ where: { id } });
  const item = await prisma.contact.update({
    where: { id },
    data: input,
    include: { contactType: true },
  });
  await writeAuditLog({ entityType: "contact", entityId: item.id, action: "update", oldValue: existing, newValue: input });
  return response.json(serializeContact(item));
});

contactsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.contact.findUnique({ where: { id } });
  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({ entityType: "contact", entityId: id, action: "delete", oldValue: existing });
  return response.status(204).send();
});
