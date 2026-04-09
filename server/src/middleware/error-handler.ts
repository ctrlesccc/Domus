import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed.",
      errors: error.flatten(),
    });
  }

  if (error instanceof HttpError) {
    return response.status(error.statusCode).json({
      message: error.expose ? error.message : "Unexpected server error.",
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return response.status(404).json({ message: "Item not found." });
    }

    return response.status(500).json({ message: "Database operation failed." });
  }

  if (error instanceof Error) {
    return response.status(500).json({ message: "Unexpected server error." });
  }

  return response.status(500).json({ message: "Unexpected server error." });
}
