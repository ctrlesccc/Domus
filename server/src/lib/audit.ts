import { prisma } from "./prisma.js";
import type { Request } from "express";

export async function writeAuditLog(input: {
  entityType: string;
  entityId: number;
  action: string;
  actorUserId?: number;
  actorUsername?: string;
  actorDisplayName?: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorUsername: input.actorUsername ?? null,
      actorDisplayName: input.actorDisplayName ?? null,
      oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
    },
  });
}

export function auditActorFromRequest(request: Request) {
  return {
    actorUserId: request.auth?.userId,
    actorUsername: request.auth?.username,
    actorDisplayName: request.auth?.displayName,
  };
}
