import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed.",
      errors: error.flatten(),
    });
  }

  if (error instanceof Error) {
    return response.status(400).json({ message: error.message });
  }

  return response.status(500).json({ message: "Unexpected server error." });
}
