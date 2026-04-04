import bcrypt from "bcryptjs";
import { Router } from "express";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { userCreateSchema, userResetPasswordSchema, userUpdateSchema } from "../lib/validators.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

async function ensureAdminGuard(targetUserId: number, nextRole: "ADMIN" | "USER", nextIsActive: boolean) {
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
  const wouldLoseAdminAccess = existing.role === "ADMIN" && existing.isActive && (nextRole !== "ADMIN" || !nextIsActive);

  if (!wouldLoseAdminAccess) {
    return;
  }

  const otherAdmins = await prisma.user.count({
    where: {
      id: { not: targetUserId },
      role: "ADMIN",
      isActive: true,
    },
  });

  if (otherAdmins === 0) {
    throw new Error("At least one active administrator must remain.");
  }
}

usersRouter.get("/", async (_request, response) => {
  const items = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return response.json(items);
});

usersRouter.post("/", async (request, response) => {
  const input = userCreateSchema.parse(request.body);
  const existing = await prisma.user.findUnique({ where: { username: input.username } });

  if (existing) {
    return response.status(409).json({ message: "A user with this username already exists." });
  }

  const item = await prisma.user.create({
    data: {
      username: input.username,
      displayName: input.displayName,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      isActive: input.isActive,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    entityType: "user",
    entityId: item.id,
    action: "create",
    ...auditActorFromRequest(request),
    newValue: item,
  });

  return response.status(201).json(item);
});

usersRouter.put("/:id", async (request, response) => {
  const id = Number(request.params.id);
  const input = userUpdateSchema.parse(request.body);
  const existing = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (request.auth!.userId === id && !input.isActive) {
    return response.status(400).json({ message: "You cannot deactivate your own account." });
  }

  try {
    await ensureAdminGuard(id, input.role, input.isActive);
  } catch (error) {
    return response.status(400).json({ message: error instanceof Error ? error.message : "User update failed." });
  }

  const item = await prisma.user.update({
    where: { id },
    data: {
      displayName: input.displayName,
      role: input.role,
      isActive: input.isActive,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    entityType: "user",
    entityId: item.id,
    action: "update",
    ...auditActorFromRequest(request),
    oldValue: existing,
    newValue: item,
  });

  return response.json(item);
});

usersRouter.post("/:id/reset-password", async (request, response) => {
  const id = Number(request.params.id);
  const input = userResetPasswordSchema.parse(request.body);
  const existing = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, username: true, displayName: true, role: true, isActive: true },
  });

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(input.newPassword, 10),
    },
  });

  await writeAuditLog({
    entityType: "user",
    entityId: id,
    action: "reset_password",
    ...auditActorFromRequest(request),
    oldValue: existing,
    newValue: { id, passwordReset: true },
  });

  return response.json({ success: true });
});
