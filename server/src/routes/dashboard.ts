import { Router } from "express";
import { ImportStatus } from "@prisma/client";
import { getOptionList, sortAlphabetically } from "../lib/app-options.js";
import { prisma } from "../lib/prisma.js";
import { serializeDocument, serializeObligation } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

function sameOrLaterThanToday(candidate: Date, today: Date) {
  return candidate.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function buildNextPlannedDate(input: {
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  plannedChargeDay?: number | null;
  plannedChargeMonth?: number | null;
  startDate?: Date | null;
  today: Date;
}) {
  const { frequency, plannedChargeDay, plannedChargeMonth, startDate, today } = input;
  if (!plannedChargeDay) {
    return null;
  }

  if (frequency === "MONTHLY") {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), plannedChargeDay);
    return sameOrLaterThanToday(thisMonth, today)
      ? thisMonth
      : new Date(today.getFullYear(), today.getMonth() + 1, plannedChargeDay);
  }

  if (frequency === "QUARTERLY") {
    const baseMonth = startDate?.getMonth() ?? (plannedChargeMonth ? plannedChargeMonth - 1 : today.getMonth());
    const candidateMonths = [baseMonth, baseMonth + 3, baseMonth + 6, baseMonth + 9]
      .map((month) => new Date(today.getFullYear(), month, plannedChargeDay))
      .sort((left, right) => left.getTime() - right.getTime());
    const upcoming = candidateMonths.find((candidate) => sameOrLaterThanToday(candidate, today));
    return upcoming ?? new Date(today.getFullYear() + 1, baseMonth, plannedChargeDay);
  }

  if (!plannedChargeMonth) {
    return null;
  }

  const thisYear = new Date(today.getFullYear(), plannedChargeMonth - 1, plannedChargeDay);
  return sameOrLaterThanToday(thisYear, today)
    ? thisYear
    : new Date(today.getFullYear() + 1, plannedChargeMonth - 1, plannedChargeDay);
}

function normalizeDashboardWindowDays(value: string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.min(365, Math.max(1, Math.round(parsed)));
}

dashboardRouter.get("/", async (_request, response) => {
  const today = new Date();
  const year = today.getFullYear();
  const [dossierOptions, planningWindowSetting] = await Promise.all([
    getOptionList("options.dossiers", []),
    prisma.appSetting.findUnique({ where: { key: "dashboard.expiryWindowDays" } }),
  ]);
  const planningWindowDays = normalizeDashboardWindowDays(planningWindowSetting?.value);
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);
  const nextPlanningDays = new Date();
  nextPlanningDays.setDate(today.getDate() + planningWindowDays);

  const [
    documentsExpiringSoon,
    obligationsEndingSoon,
    importantDocuments,
    activePolicyDocuments,
    activeObligations,
    documentCount,
    contactCount,
    personalContactCount,
    obligationCount,
    activeObligationCount,
    importQueueCount,
    recentImportItems,
  ] = await Promise.all([
    prisma.document.findMany({
      where: {
        expiryDate: { gte: today, lte: next30Days },
        status: "ACTIVE",
        deletedAt: null,
        isLatestVersion: true,
      },
      include: {
        documentType: true,
        contact: true,
        documentContacts: { include: { contact: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),
    prisma.obligation.findMany({
      where: {
        endDate: { gte: today, lte: next30Days },
        status: "ACTIVE",
        deletedAt: null,
      },
      include: { obligationType: true, contact: true },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: {
        isImportant: true,
        deletedAt: null,
        isLatestVersion: true,
      },
      include: {
        documentType: true,
        contact: true,
        documentContacts: { include: { contact: true } },
        obligationDocuments: { include: { obligation: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 6,
    }),
    prisma.document.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        isLatestVersion: true,
        documentType: {
          name: {
            contains: "Polis",
          },
        },
      },
      include: {
        documentType: true,
        contact: true,
        documentContacts: { include: { contact: true } },
        obligationDocuments: {
          where: {
            obligation: {
              status: "ACTIVE",
              deletedAt: null,
            },
          },
          include: {
            obligation: true,
          },
          orderBy: {
            obligation: {
              updatedAt: "desc",
            },
          },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.obligation.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        obligationType: true,
        contact: true,
        obligationDocuments: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.document.count({ where: { deletedAt: null, isLatestVersion: true } }),
    prisma.contact.count({ where: { kind: "BUSINESS", deletedAt: null } }),
    prisma.contact.count({ where: { kind: "PERSONAL", deletedAt: null } }),
    prisma.obligation.count({ where: { deletedAt: null } }),
    prisma.obligation.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.importDocument.count({ where: { status: ImportStatus.PENDING } }),
    prisma.importDocument.findMany({
      where: { status: { in: [ImportStatus.PENDING, ImportStatus.ERROR] } },
      orderBy: { discoveredAt: "desc" },
      take: 5,
    }),
  ]);

  const upcomingPlannedCharges = activeObligations
    .filter((item) => item.plannedChargeDay)
    .map((item) => {
      const nextDate = buildNextPlannedDate({
        frequency: item.frequency,
        plannedChargeDay: item.plannedChargeDay,
        plannedChargeMonth: item.plannedChargeMonth,
        startDate: item.startDate,
        today,
      });
      return {
        obligation: item,
        plannedDate: nextDate,
      };
    })
    .filter((item): item is { obligation: (typeof activeObligations)[number]; plannedDate: Date } => Boolean(item.plannedDate))
    .filter((item) => item.plannedDate >= today && item.plannedDate <= nextPlanningDays)
    .sort((left, right) => left.plannedDate.getTime() - right.plannedDate.getTime())
    .slice(0, 8)
    .map((item) => ({
      ...serializeObligation(item.obligation),
      plannedDate: item.plannedDate,
    }));

  const activePolicies = activePolicyDocuments.map((document) => ({
    id: document.id,
    title: document.title,
    contactName: document.contact?.name ?? "Niet gekoppeld",
    obligations: document.obligationDocuments.map((item) => ({
      id: item.obligation.id,
      title: item.obligation.title,
      amount: item.obligation.amountInCents / 100,
      currency: item.obligation.currency,
    })),
    downloadUrl: `/api/documents/${document.id}/download`,
  }));

  type PolicyGroup = {
    insurer: string;
    policies: typeof activePolicies;
  };

  const groupedPoliciesMap = new Map<string, PolicyGroup>();
  for (const policy of activePolicies) {
    const insurer = policy.contactName;
    const currentGroup = groupedPoliciesMap.get(insurer);
    if (currentGroup) {
      currentGroup.policies.push(policy);
    } else {
      groupedPoliciesMap.set(insurer, { insurer, policies: [policy] });
    }
  }

  const yearlyMultiplier: Record<string, number> = {
    MONTHLY: 12,
    QUARTERLY: 4,
    YEARLY: 1,
    ONE_TIME: 1,
  };

  const costSummary = activeObligations.reduce(
    (totals, obligation) => {
      const annualized = (obligation.amountInCents / 100) * (yearlyMultiplier[obligation.frequency] ?? 1);
      totals.yearly += annualized;
      totals.monthly += annualized / 12;
      return totals;
    },
    { monthly: 0, yearly: 0 },
  );

  const annualCostByTypeMap = new Map<string, { typeName: string; count: number; monthly: number; yearly: number; obligations: ReturnType<typeof serializeObligation>[] }>();
  for (const obligation of activeObligations) {
    const key = obligation.obligationType.name;
    const annualized = (obligation.amountInCents / 100) * (yearlyMultiplier[obligation.frequency] ?? 1);
    const current = annualCostByTypeMap.get(key) ?? { typeName: key, count: 0, monthly: 0, yearly: 0, obligations: [] };
    current.count += 1;
    current.yearly += annualized;
    current.monthly += annualized / 12;
    current.obligations.push(serializeObligation(obligation));
    annualCostByTypeMap.set(key, current);
  }

  const missingData = {
    documentsWithoutDate: activePolicyDocuments
      .filter((document) => !document.documentDate)
      .map((document) => ({
        id: document.id,
        title: document.title,
        downloadUrl: `/api/documents/${document.id}/download`,
      })),
    obligationsWithoutAmount: activeObligations
      .filter((obligation) => obligation.amountInCents <= 0)
      .map((obligation) => ({
        id: obligation.id,
        title: obligation.title,
      })),
  };

  return response.json({
    stats: {
      documentCount,
      contactCount,
      personalContactCount,
      obligationCount,
      activeObligationCount,
      importQueueCount,
    },
    documentsExpiringSoon: documentsExpiringSoon.map(serializeDocument),
    obligationsEndingSoon: obligationsEndingSoon.map(serializeObligation),
    importantDocuments: importantDocuments.map(serializeDocument),
    upcomingPlannedCharges,
    planningWindowDays,
    activePolicies,
    policyGroups: [...groupedPoliciesMap.values()],
    costSummary,
    annualCostByType: sortAlphabetically([...annualCostByTypeMap.values()], (item) => item.typeName),
    dossierOptions,
    missingData,
    importQueue: recentImportItems,
  });
});
