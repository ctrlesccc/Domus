import type { NextFunction, Request, Response } from "express";
import { getAuthCookieName, verifyAuthToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        username: string;
        displayName: string;
        role: "ADMIN" | "USER";
      };
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies[getAuthCookieName()];

  if (!token) {
    return response.status(401).json({ message: "Authentication required." });
  }

  try {
    request.auth = verifyAuthToken(token);
    next();
  } catch {
    return response.status(401).json({ message: "Session expired." });
  }
}

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (!request.auth) {
    return response.status(401).json({ message: "Authentication required." });
  }

  if (request.auth.role !== "ADMIN") {
    return response.status(403).json({ message: "Administrator access required." });
  }

  next();
}
