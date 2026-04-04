import type { AppSetting, ReferenceItem } from "../types";

export const defaultDossierOptions = ["Verzekeringen", "Wonen", "Zorg", "Energie", "Overig"];
export const defaultPaymentMethodOptions = ["Incasso", "Contant", "Creditcard", "Paypal"];

export function sortByLabel<T>(items: T[], pickLabel: (item: T) => string) {
  return [...items].sort((left, right) => pickLabel(left).localeCompare(pickLabel(right), "nl"));
}

export function parseStringListSetting(settings: AppSetting[], key: string, fallback: string[]) {
  const raw = settings.find((item) => item.key === key)?.value;
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallback;
    }
    const normalized = parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return normalized.length ? [...new Set(normalized)].sort((left, right) => left.localeCompare(right, "nl")) : fallback;
  } catch {
    return fallback;
  }
}

export function dossierSelectOptions(settings: AppSetting[]) {
  return parseStringListSetting(settings, "options.dossiers", defaultDossierOptions);
}

export function paymentMethodOptions(settings: AppSetting[]) {
  return parseStringListSetting(settings, "options.paymentMethods", defaultPaymentMethodOptions);
}

export function referenceOptions(items: ReferenceItem[]) {
  return sortByLabel(items, (item) => item.name);
}
