import { Router } from "express";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { defaultDossierOptions, defaultPaymentMethodOptions } from "../lib/app-options.js";
import { prisma } from "../lib/prisma.js";
import { settingsSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", async (_request, response) => {
  const items = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  return response.json(items);
});

settingsRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = settingsSchema.parse(request.body);
  const existing = await prisma.appSetting.findUnique({ where: { id } });
  if (existing?.key === "options.dossiers") {
    const previous = new Set<string>(JSON.parse(existing.value || "[]"));
    const next = new Set<string>(JSON.parse(input.value || "[]"));
    const removed = [...previous].filter((value) => !next.has(value));
    const added = [...next].filter((value) => !previous.has(value));

    if (!next.size) {
      input.value = JSON.stringify(defaultDossierOptions);
    }

    if (removed.length === 1 && added.length === 1) {
      const from = removed[0];
      const to = added[0];
      await prisma.$transaction([
        prisma.contact.updateMany({ where: { dossierTopic: from }, data: { dossierTopic: to } }),
        prisma.document.updateMany({ where: { dossierTopic: from }, data: { dossierTopic: to } }),
        prisma.obligation.updateMany({ where: { dossierTopic: from }, data: { dossierTopic: to } }),
        prisma.importDocument.updateMany({ where: { draftDossierTopic: from }, data: { draftDossierTopic: to } }),
      ]);
    } else if (removed.length) {
      await prisma.$transaction([
        prisma.contact.updateMany({ where: { dossierTopic: { in: removed } }, data: { dossierTopic: "" } }),
        prisma.document.updateMany({ where: { dossierTopic: { in: removed } }, data: { dossierTopic: "" } }),
        prisma.obligation.updateMany({ where: { dossierTopic: { in: removed } }, data: { dossierTopic: "" } }),
        prisma.importDocument.updateMany({ where: { draftDossierTopic: { in: removed } }, data: { draftDossierTopic: "" } }),
      ]);
    }
  }

  if (existing?.key === "options.paymentMethods") {
    try {
      const next = JSON.parse(input.value || "[]");
      if (!Array.isArray(next) || !next.length) {
        input.value = JSON.stringify(defaultPaymentMethodOptions);
      }
    } catch {
      input.value = JSON.stringify(defaultPaymentMethodOptions);
    }
  }

  if (existing?.key === "dashboard.expiryWindowDays") {
    const parsed = Number(input.value);
    input.value = String(Number.isFinite(parsed) ? Math.min(365, Math.max(1, Math.round(parsed))) : 30);
  }

  const item = await prisma.appSetting.update({
    where: { id },
    data: input,
  });
  await writeAuditLog({ entityType: "setting", entityId: item.id, action: "update", ...auditActorFromRequest(request), oldValue: existing, newValue: input });
  return response.json(item);
});
