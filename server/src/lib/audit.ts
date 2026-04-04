import { prisma } from "./prisma.js";

export async function writeAuditLog(input: {
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
    },
  });
}
