import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { deleteStoredFile } from "../lib/storage.js";
import { requireAuth } from "../middleware/auth.js";

export const trashRouter = Router();

trashRouter.use(requireAuth);

trashRouter.get("/", async (_request, response) => {
  const [documents, obligations, contacts] = await Promise.all([
    prisma.document.findMany({
      where: { deletedAt: { not: null } },
      include: { documentType: true, contact: true },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.obligation.findMany({
      where: { deletedAt: { not: null } },
      include: { obligationType: true, contact: true },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { deletedAt: { not: null } },
      include: { contactType: true },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  return response.json({ documents, obligations, contacts });
});

trashRouter.post("/:entityType/:id/restore", async (request, response) => {
  const id = Number(request.params.id);
  const entityType = request.params.entityType;

  if (entityType === "documents") {
    const item = await prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });
    return response.json(item);
  }

  if (entityType === "obligations") {
    const item = await prisma.obligation.update({
      where: { id },
      data: { deletedAt: null },
    });
    return response.json(item);
  }

  if (entityType === "contacts") {
    const item = await prisma.contact.update({
      where: { id },
      data: { deletedAt: null },
    });
    return response.json(item);
  }

  return response.status(400).json({ message: "Unknown trash entity." });
});

trashRouter.delete("/:entityType/:id", async (request, response) => {
  const id = Number(request.params.id);
  const entityType = request.params.entityType;

  if (entityType === "documents") {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return response.status(404).json({ message: "Document not found." });
    }
    await prisma.document.delete({ where: { id } });
    await deleteStoredFile(document.storagePath);
    return response.status(204).send();
  }

  if (entityType === "obligations") {
    await prisma.obligation.delete({ where: { id } });
    return response.status(204).send();
  }

  if (entityType === "contacts") {
    await prisma.contact.delete({ where: { id } });
    return response.status(204).send();
  }

  return response.status(400).json({ message: "Unknown trash entity." });
});
