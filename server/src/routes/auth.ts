import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { clearAuthCookie, setAuthCookie, signAuthToken } from "../lib/auth.js";
import { loginSchema } from "../lib/validators.js";
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

  const token = signAuthToken({
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  });

  setAuthCookie(response, token);
  return response.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
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
