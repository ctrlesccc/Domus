import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { referenceSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const obligationTypesRouter = Router();

obligationTypesRouter.use(requireAuth);

obligationTypesRouter.get("/", async (_request, response) => {
  const items = await prisma.obligationType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return response.json(items);
});

obligationTypesRouter.post("/", async (request, response) => {
  const input = referenceSchema.parse(request.body);
  const item = await prisma.obligationType.create({
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ entityType: "obligation-type", entityId: item.id, action: "create", newValue: input });
  return response.status(201).json(item);
});

obligationTypesRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = referenceSchema.parse(request.body);
  const existing = await prisma.obligationType.findUnique({ where: { id } });
  const item = await prisma.obligationType.update({
    where: { id },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await writeAuditLog({ entityType: "obligation-type", entityId: item.id, action: "update", oldValue: existing, newValue: input });
  return response.json(item);
});

obligationTypesRouter.delete("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const existing = await prisma.obligationType.findUnique({ where: { id } });
  const usage = await prisma.obligation.count({ where: { obligationTypeId: id } });
  if (usage > 0) {
    return response.status(409).json({ message: "Obligation type is still in use." });
  }

  await prisma.obligationType.delete({ where: { id } });
  await writeAuditLog({ entityType: "obligation-type", entityId: id, action: "delete", oldValue: existing });
  return response.status(204).send();
});
