import type { NextFunction, Request, Response } from "express";
import { getAuthCookieName, verifyAuthToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        username: string;
        displayName: string;
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
