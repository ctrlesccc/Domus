import jwt from "jsonwebtoken";
import type { Response } from "express";
import { config } from "../config.js";

export type AuthPayload = {
  userId: number;
  username: string;
  displayName: string;
};

const cookieName = "domus_token";

export function signAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(cookieName);
}

export function getAuthCookieName() {
  return cookieName;
}
