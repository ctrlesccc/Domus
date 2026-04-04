import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get("/", async (request, response) => {
  const entityType = String(request.query.entityType ?? "").trim();
  const action = String(request.query.action ?? "").trim();
  const limit = Math.min(Number(request.query.limit ?? 60) || 60, 200);

  const items = await prisma.auditLog.findMany({
    where: {
      entityType: entityType || undefined,
      action: action || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return response.json(
    items.map((item) => ({
      ...item,
      oldValue: item.oldValue ? JSON.parse(item.oldValue) : null,
      newValue: item.newValue ? JSON.parse(item.newValue) : null,
    })),
  );
});
