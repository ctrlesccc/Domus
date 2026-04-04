import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
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
  const item = await prisma.appSetting.update({
    where: { id },
    data: input,
  });
  await writeAuditLog({ entityType: "setting", entityId: item.id, action: "update", oldValue: existing, newValue: input });
  return response.json(item);
});
