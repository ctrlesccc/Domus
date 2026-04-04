import bcrypt from "bcryptjs";
import { Router } from "express";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { clearAuthCookie, setAuthCookie, signAuthToken } from "../lib/auth.js";
import { changePasswordSchema, loginSchema } from "../lib/validators.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { username: input.username } });

  if (!user) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  if (!user.isActive) {
    return response.status(403).json({ message: "This account is inactive." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAuthToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });

  setAuthCookie(response, token);
  return response.json({
    user: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: new Date().toISOString(),
    },
  });
});

authRouter.post("/logout", (_request, response) => {
  clearAuthCookie(response);
  return response.json({ success: true });
});

authRouter.get("/me", requireAuth, async (request, response) => {
  return response.json({ user: request.auth });
});

authRouter.post("/change-password", requireAuth, async (request, response) => {
  const input = changePasswordSchema.parse(request.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: request.auth!.userId } });
  const passwordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!passwordValid) {
    return response.status(400).json({ message: "Current password is incorrect." });
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await writeAuditLog({
    entityType: "user",
    entityId: user.id,
    action: "change_password",
    ...auditActorFromRequest(request),
  });

  return response.json({ success: true });
});
