import { Router } from "express";
import { ImportStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { serializeDocument, serializeObligation } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", async (_request, response) => {
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  const [
    documentsExpiringSoon,
    obligationsEndingSoon,
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

  const annualCostByTypeMap = new Map<string, { typeName: string; count: number; monthly: number; yearly: number }>();
  for (const obligation of activeObligations) {
    const key = obligation.obligationType.name;
    const annualized = (obligation.amountInCents / 100) * (yearlyMultiplier[obligation.frequency] ?? 1);
    const current = annualCostByTypeMap.get(key) ?? { typeName: key, count: 0, monthly: 0, yearly: 0 };
    current.count += 1;
    current.yearly += annualized;
    current.monthly += annualized / 12;
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
    activePolicies,
    policyGroups: [...groupedPoliciesMap.values()],
    costSummary,
    annualCostByType: [...annualCostByTypeMap.values()].sort((left, right) => right.yearly - left.yearly),
    missingData,
    importQueue: recentImportItems,
  });
});
