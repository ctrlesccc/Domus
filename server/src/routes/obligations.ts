import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { serializeObligation } from "../lib/serializers.js";
import { obligationSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const obligationsRouter = Router();

obligationsRouter.use(requireAuth);

obligationsRouter.get("/", async (request, response) => {
  const q = String(request.query.q ?? "").trim();
  const status = request.query.status ? String(request.query.status) : undefined;
  const obligationTypeId = request.query.obligationTypeId ? Number(request.query.obligationTypeId) : undefined;
  const showOnDashboard =
    request.query.showOnDashboard === "true"
      ? true
      : request.query.showOnDashboard === "false"
        ? false
        : undefined;
  const endBefore = request.query.endBefore ? new Date(String(request.query.endBefore)) : undefined;

  const items = await prisma.obligation.findMany({
    where: {
      deletedAt: null,
      status: status as never,
      obligationTypeId,
      showOnDashboard,
      endDate: endBefore ? { lte: endBefore } : undefined,
      OR: q
        ? [
            { title: { contains: q } },
            { notes: { contains: q } },
            { contractNumber: { contains: q } },
          ]
        : undefined,
    },
    include: {
      obligationType: true,
      contact: true,
      obligationDocuments: {
        include: {
          document: true,
        },
      },
    },
    orderBy: [{ endDate: "asc" }, { title: "asc" }],
  });

  return response.json(items.map(serializeObligation));
});

obligationsRouter.get("/:id", async (request, response) => {
  const item = await prisma.obligation.findUnique({
    where: { id: Number(request.params.id) },
    include: {
      obligationType: true,
      contact: true,
      obligationDocuments: {
        include: {
          document: true,
        },
      },
    },
  });

  if (!item) {
    return response.status(404).json({ message: "Obligation not found." });
  }

  if (item.deletedAt) {
    return response.status(404).json({ message: "Obligation not found." });
  }

  return response.json(serializeObligation(item));
});

obligationsRouter.post("/", async (request, response) => {
  const input = obligationSchema.parse(request.body);
  const item = await prisma.obligation.create({
    data: {
      title: input.title,
      obligationTypeId: input.obligationTypeId,
      contactId: input.contactId,
      contractNumber: input.contractNumber,
      amountInCents: Math.round(input.amount * 100),
      currency: input.currency,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      cancellationPeriodDays: input.cancellationPeriodDays,
      paymentMethod: input.paymentMethod,
      autoRenew: input.autoRenew,
      showOnDashboard: input.showOnDashboard,
      reminderDate: input.reminderDate,
      reviewDate: input.reviewDate,
      status: input.status,
      notes: input.notes,
      dossierTopic: input.dossierTopic,
      obligationDocuments: {
        create: input.documentIds.map((documentId) => ({ documentId })),
      },
    },
    include: {
      obligationType: true,
      contact: true,
      obligationDocuments: { include: { document: true } },
    },
  });

  await writeAuditLog({ entityType: "obligation", entityId: item.id, action: "create", newValue: input });
  return response.status(201).json(serializeObligation(item));
});

obligationsRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = obligationSchema.parse(request.body);
  const existing = await prisma.obligation.findUnique({ where: { id } });

  await prisma.obligationDocument.deleteMany({ where: { obligationId: id } });

  const item = await prisma.obligation.update({
    where: { id },
    data: {
      title: input.title,
      obligationTypeId: input.obligationTypeId,
      contactId: input.contactId,
      contractNumber: input.contractNumber,
      amountInCents: Math.round(input.amount * 100),
      currency: input.currency,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      cancellationPeriodDays: input.cancellationPeriodDays,
      paymentMethod: input.paymentMethod,
      autoRenew: input.autoRenew,
      showOnDashboard: input.showOnDashboard,
      reminderDate: input.reminderDate,
      reviewDate: input.reviewDate,
      status: input.status,
      notes: input.notes,
      dossierTopic: input.dossierTopic,
      obligationDocuments: {
        create: input.documentIds.map((documentId) => ({ documentId })),
      },
    },
    include: {
      obligationType: true,
      contact: true,
      obligationDocuments: { include: { document: true } },
    },
  });

  await writeAuditLog({ entityType: "obligation", entityId: item.id, action: "update", oldValue: existing, newValue: input });
  return response.json(serializeObligation(item));
});

obligationsRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.obligation.findUnique({ where: { id } });
  await prisma.obligation.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await writeAuditLog({ entityType: "obligation", entityId: id, action: "delete", oldValue: existing });
  return response.status(204).send();
});
