import { prisma } from "./prisma.js";

export const defaultDossierOptions = ["Verzekeringen", "Wonen", "Zorg", "Energie", "Overig"];
export const defaultPaymentMethodOptions = ["Incasso", "Contant", "Creditcard", "Paypal"];

function normalizeOptions(input: unknown, fallback: string[]) {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const normalized = input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return normalized.length ? [...new Set(normalized)].sort((left, right) => left.localeCompare(right, "nl")) : fallback;
}

export async function getOptionList(key: string, fallback: string[]) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  if (!setting) {
    return fallback;
  }

  try {
    return normalizeOptions(JSON.parse(setting.value), fallback);
  } catch {
    return fallback;
  }
}

export async function getAppOptions() {
  const [dossiers, paymentMethods] = await Promise.all([
    getOptionList("options.dossiers", defaultDossierOptions),
    getOptionList("options.paymentMethods", defaultPaymentMethodOptions),
  ]);

  return { dossiers, paymentMethods };
}

export function sortAlphabetically<T>(items: T[], pickLabel: (item: T) => string) {
  return [...items].sort((left, right) => pickLabel(left).localeCompare(pickLabel(right), "nl"));
}
