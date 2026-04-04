import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { serializeContact, serializeDocument, serializeObligation } from "../lib/serializers.js";
import { requireAuth } from "../middleware/auth.js";

const dossierDefinitions = [
  { key: "VERZEKERINGEN", title: "Verzekeringen", keywords: ["verzekering", "polis", "reaal", "asr", "interpolis", "aansprakelijkheid"] },
  { key: "WONEN", title: "Wonen", keywords: ["woning", "huis", "huur", "hypotheek", "gemeente", "vastgoed"] },
  { key: "ZORG", title: "Zorg", keywords: ["zorg", "huisarts", "ziekenhuis", "apotheek", "medisch", "tandarts"] },
  { key: "ENERGIE", title: "Energie", keywords: ["energie", "stroom", "gas", "water", "internet", "telecom"] },
  { key: "OVERIG", title: "Overig", keywords: [] },
  { key: "NONE", title: "Nog In Te Delen", keywords: [] },
] as const;

function matchesKeywords(values: Array<string | null | undefined>, keywords: readonly string[]) {
  const haystack = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

export const dossiersRouter = Router();

dossiersRouter.use(requireAuth);

dossiersRouter.get("/", async (_request, response) => {
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
      (item.dossierTopic === "NONE" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.title, item.notes, item.documentType.name, item.contact?.name], definition.keywords)) ||
      (definition.key === "OVERIG" && item.dossierTopic === "OVERIG") ||
      (definition.key === "NONE" &&
        item.dossierTopic === "NONE" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "NONE" && entry.key !== "OVERIG")
          .some((entry) => matchesKeywords([item.title, item.notes, item.documentType.name, item.contact?.name], entry.keywords))),
    );
    const dossierObligations = obligations.filter((item) =>
      item.dossierTopic === definition.key ||
      (item.dossierTopic === "NONE" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.title, item.notes, item.contractNumber, item.obligationType.name, item.contact?.name], definition.keywords)) ||
      (definition.key === "OVERIG" && item.dossierTopic === "OVERIG") ||
      (definition.key === "NONE" &&
        item.dossierTopic === "NONE" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "NONE" && entry.key !== "OVERIG")
          .some((entry) => matchesKeywords([item.title, item.notes, item.contractNumber, item.obligationType.name, item.contact?.name], entry.keywords))),
    );
    const dossierContacts = contacts.filter((item) =>
      item.dossierTopic === definition.key ||
      (item.dossierTopic === "NONE" &&
        definition.keywords.length > 0 &&
        matchesKeywords([item.name, item.notes, item.city, item.contactType.name], definition.keywords)) ||
      (definition.key === "OVERIG" && item.dossierTopic === "OVERIG") ||
      (definition.key === "NONE" &&
        item.dossierTopic === "NONE" &&
        !dossierDefinitions
          .filter((entry) => entry.key !== "NONE" && entry.key !== "OVERIG")
          .some((entry) => matchesKeywords([item.name, item.notes, item.city, item.contactType.name], entry.keywords))),
    );

    return {
      key: definition.key,
      title: definition.title,
      summary: `${dossierDocuments.length} documenten · ${dossierObligations.length} verplichtingen · ${dossierContacts.length} contacten`,
      documents: dossierDocuments.slice(0, 8).map(serializeDocument),
      obligations: dossierObligations.slice(0, 8).map(serializeObligation),
      contacts: dossierContacts.slice(0, 8).map(serializeContact),
    };
  });

  return response.json({
    dossiers,
  });
});
