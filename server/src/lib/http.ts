import type { Response } from "express";

export function sendValidationError(response: Response, message: string) {
  return response.status(400).json({ message });
}
