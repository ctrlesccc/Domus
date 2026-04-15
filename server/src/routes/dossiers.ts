import { Router } from "express";
import { auditActorFromRequest, writeAuditLog } from "../lib/audit.js";
import { defaultDossierOptions, getOptionList, sortAlphabetically } from "../lib/app-options.js";
import { prisma } from "../lib/prisma.js";
import { serializeContact, serializeDocument, serializeObligation } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";

const dossierKeywordMap: Record<string, string[]> = {
  Verzekeringen: ["verzekering", "polis", "reaal", "asr", "interpolis", "aansprakelijkheid"],
  Wonen: ["woning", "huis", "huur", "hypotheek", "gemeente", "vastgoed"],
  Zorg: ["zorg", "huisarts", "ziekenhuis", "apotheek", "medisch", "tandarts"],
  Energie: ["energie", "stroom", "gas", "water", "internet", "telecom"],
  Overig: [],
};

function matchesKeywords(values: Array<string | null | undefined>, keywords: readonly string[]) {
  const haystack = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function sortDocumentsByDocumentDate<T extends { documentDate: Date | null; createdAt: Date }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftDate = left.documentDate?.getTime() ?? 0;
    const rightDate = right.documentDate?.getTime() ?? 0;

    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

export const dossiersRouter = Router();

dossiersRouter.use(requireAuth);

dossiersRouter.post("/assign", async (request, response) => {
  const entityType = String(request.body?.entityType ?? "").trim();
  const entityId = Number(request.body?.entityId);
  const dossierTopic = String(request.body?.dossierTopic ?? "").trim();

  if (!["document", "contact", "obligation"].includes(entityType) || !Number.isInteger(entityId) || entityId <= 0) {
    return response.status(400).json({ message: "Ongeldige dossierwijziging." });
  }

  if (entityType === "document") {
    const existing = await prisma.document.findUnique({ where: { id: entityId } });
    if (!existing || existing.deletedAt) {
      return response.status(404).json({ message: "Document niet gevonden." });
    }

    await prisma.document.update({
      where: { id: entityId },
      data: { dossierTopic },
    });
    await writeAuditLog({
      entityType: "document",
      entityId,
      action: "update_dossier",
      ...auditActorFromRequest(request),
      oldValue: { dossierTopic: existing.dossierTopic },
      newValue: { dossierTopic },
    });
  }

  if (entityType === "contact") {
    const existing = await prisma.contact.findUnique({ where: { id: entityId } });
    if (!existing || existing.deletedAt) {
      return response.status(404).json({ message: "Contact niet gevonden." });
    }

    await prisma.contact.update({
      where: { id: entityId },
      data: { dossierTopic },
    });
    await writeAuditLog({
      entityType: "contact",
      entityId,
      action: "update_dossier",
      ...auditActorFromRequest(request),
      oldValue: { dossierTopic: existing.dossierTopic },
      newValue: { dossierTopic },
    });
  }

  if (entityType === "obligation") {
    const existing = await prisma.obligation.findUnique({ where: { id: entityId } });
    if (!existing || existing.deletedAt) {
      return response.status(404).json({ message: "Verplichting niet gevonden." });
    }

    await prisma.obligation.update({
      where: { id: entityId },
      data: { dossierTopic },
    });
    await writeAuditLog({
      entityType: "obligation",
      entityId,
      action: "update_dossier",
      ...auditActorFromRequest(request),
      oldValue: { dossierTopic: existing.dossierTopic },
      newValue: { dossierTopic },
    });
  }

  return response.json({ success: true });
});

dossiersRouter.get("/", async (_request, response) => {
  const configuredDossiers = await getOptionList("options.dossiers", defaultDossierOptions);
  const dossierDefinitions = [
    ...configuredDossiers.map((title) => ({ key: title, title, keywords: dossierKeywordMap[title] ?? [] })),
    { key: "", title: "Nog In Te Delen", keywords: [] as string[] },
  ];
  const [documents, obligations, contacts] = await Promise.all([
    prisma.document.findMany({
      where: { deletedAt: null, isLatestVersion: true },
      include: {
        documentType: true,
        contact: true,
        documentContacts: { include: { contact: true } },
        obligationDocuments: { include: { obligation: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.obligation.findMany({
      where: { deletedAt: null },
      include: {
        obligationType: true,
        contact: true,
        obligationDocuments: { include: { document: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      include: { contactType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const dossiers = dossierDefinitions.map((definition) => {
    const dossierDocuments = documents.filter((item) =>
      item.dossierTopic === definition.key ||
      (item.dossierTopic === "" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.title, item.notes, item.documentType.name, item.contact?.name], definition.keywords)) ||
      (definition.key === "" &&
        item.dossierTopic === "" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "")
          .some((entry) => matchesKeywords([item.title, item.notes, item.documentType.name, item.contact?.name], entry.keywords))),
    );
    const dossierObligations = obligations.filter((item) =>
      item.dossierTopic === definition.key ||
      (item.dossierTopic === "" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.title, item.notes, item.contractNumber, item.obligationType.name, item.contact?.name], definition.keywords)) ||
      (definition.key === "" &&
        item.dossierTopic === "" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "")
          .some((entry) => matchesKeywords([item.title, item.notes, item.contractNumber, item.obligationType.name, item.contact?.name], entry.keywords))),
    );
    const dossierContacts = contacts.filter((item) =>
      item.dossierTopic === definition.key ||
      (item.dossierTopic === "" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.name, item.notes, item.city, item.contactType.name], definition.keywords)) ||
      (definition.key === "" &&
        item.dossierTopic === "" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "")
          .some((entry) => matchesKeywords([item.name, item.notes, item.city, item.contactType.name], entry.keywords))),
    );

    return {
      key: definition.key,
      title: definition.title,
      summary: `${dossierDocuments.length} documenten · ${dossierObligations.length} verplichtingen · ${dossierContacts.length} contacten`,
      documents: sortDocumentsByDocumentDate(dossierDocuments).map(serializeDocument),
      obligations: sortAlphabetically(dossierObligations, (item) => item.title).map(serializeObligation),
      contacts: sortAlphabetically(dossierContacts, (item) => item.name).map(serializeContact),
    };
  });

  return response.json({
    dossiers,
  });
});
