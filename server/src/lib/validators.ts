import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const optionalBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value === "true" || value === "1" || value === "on";
    }
    return false;
  });

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value ? new Date(value) : undefined))
  .optional();

const optionalAmount = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().replace(",", ".");
      if (!normalized) {
        return undefined;
      }
      return Number(normalized);
    }
    return undefined;
  });

const optionalMonthDay = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      return Number(value);
    }
    return undefined;
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const userCreateSchema = z.object({
  username: z.string().trim().min(3),
  displayName: z.string().trim().min(2),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  isActive: optionalBoolean.default(true),
});

export const userUpdateSchema = z.object({
  displayName: z.string().trim().min(2),
  role: z.enum(["ADMIN", "USER"]),
  isActive: optionalBoolean.default(true),
});

export const userResetPasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const referenceSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: optionalBoolean.default(true),
  category: z.enum(["BUSINESS", "PERSONAL", "BOTH"]).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1),
  address: optionalString,
  postalCode: optionalString,
  city: optionalString,
  phone: optionalString,
  email: z
    .string()
    .trim()
    .email()
    .or(z.literal(""))
    .optional()
    .transform((value) => value || undefined),
  website: optionalString,
  contactTypeId: z.coerce.number().int().positive(),
  kind: z.enum(["BUSINESS", "PERSONAL"]),
  sendChristmasCard: optionalBoolean.default(false),
  sendFuneralCard: optionalBoolean.default(false),
  sendBirthdayCard: optionalBoolean.default(false),
  birthDate: optionalDate,
  notes: optionalString,
  dossierTopic: optionalString.default(""),
  isActive: optionalBoolean.default(true),
});

const obligationBaseSchema = z.object({
  title: z.string().trim().min(1),
  obligationTypeId: z.coerce.number().int().positive(),
  contactId: z.coerce.number().int().positive().optional(),
  contractNumber: optionalString,
  amount: optionalAmount.pipe(z.number().min(0)).default(0),
  currency: z.string().trim().min(3).max(3).default("EUR"),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]),
  startDate: optionalDate,
  endDate: optionalDate,
  cancellationPeriodDays: z.coerce.number().int().min(0).optional(),
  paymentMethod: optionalString,
  autoRenew: optionalBoolean.default(false),
  showOnDashboard: optionalBoolean.default(false),
  reminderDate: optionalDate,
  reviewDate: optionalDate,
  plannedChargeDay: optionalMonthDay.pipe(z.number().int().min(1).max(31).optional()),
  plannedChargeMonth: optionalMonthDay.pipe(z.number().int().min(1).max(12).optional()),
  status: z.enum(["ACTIVE", "ENDED", "EXPIRED"]).default("ACTIVE"),
  notes: optionalString,
  dossierTopic: optionalString.default(""),
  documentIds: z
    .union([z.array(z.coerce.number().int().positive()), z.string(), z.undefined()])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        return value
          .split(",")
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isFinite(item) && item > 0);
      }
      return [];
    }),
});

export const obligationSchema = obligationBaseSchema
  .refine((input) => !input.startDate || !input.endDate || input.endDate >= input.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
  })
  .refine(
    (input) =>
      (!input.plannedChargeDay && !input.plannedChargeMonth) ||
      (Boolean(input.plannedChargeDay) && Boolean(input.plannedChargeMonth)),
    {
      message: "Planned charge date requires both day and month.",
      path: ["plannedChargeDay"],
    },
  );

export const documentSchema = z.object({
  title: z.string().trim().min(1),
  documentTypeId: z.coerce.number().int().positive(),
  contactId: z.coerce.number().int().positive().optional(),
  contactIds: z
    .union([z.array(z.coerce.number().int().positive()), z.string(), z.undefined()])
    .transform((value) => {
      if (Array.isArray(value)) {
        return [...new Set(value)];
      }
      if (typeof value === "string" && value.trim()) {
        return [...new Set(
          value
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isFinite(item) && item > 0),
        )];
      }
      return [];
    }),
  expiryDate: optionalDate,
  documentDate: optionalDate,
  status: z.enum(["ACTIVE", "EXPIRED", "ARCHIVED"]).default("ACTIVE"),
  notes: optionalString,
  dossierTopic: optionalString.default(""),
  createNewVersion: optionalBoolean.default(false),
  obligationIds: z
    .union([z.array(z.coerce.number().int().positive()), z.string(), z.undefined()])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        return value
          .split(",")
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isFinite(item) && item > 0);
      }
      return [];
    }),
});

export const settingsSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim(),
});
