import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { serializeContact, serializeDocument, serializeObligation } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get("/", async (request, response) => {
  const q = String(request.query.q ?? "").trim();
  if (!q) {
    return response.json({ documents: [], contacts: [], obligations: [] });
  }

  const [documents, contacts, obligations] = await Promise.all([
    prisma.document.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q } },
          { originalFilename: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      include: {
        documentType: true,
        contact: true,
        documentContacts: { include: { contact: true } },
        obligationDocuments: { include: { obligation: true } },
      },
      take: 10,
    }),
    prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { city: { contains: q } },
          { phone: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      include: { contactType: true },
      take: 10,
    }),
    prisma.obligation.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { contractNumber: { contains: q } },
        ],
      },
      include: {
        obligationType: true,
        contact: true,
        obligationDocuments: { include: { document: true } },
      },
      take: 10,
    }),
  ]);

  return response.json({
    documents: documents.map(serializeDocument),
    contacts: contacts.map(serializeContact),
    obligations: obligations.map(serializeObligation),
  });
});
