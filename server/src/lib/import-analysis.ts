import fs from "node:fs/promises";
import { ImportStatus, OcrStatus } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { defaultDossierOptions } from "./app-options.js";
import { prisma } from "./prisma.js";

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function overlapScore(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function parseDutchDate(value: string) {
  const months: Record<string, number> = {
    januari: 0,
    februari: 1,
    maart: 2,
    april: 3,
    mei: 4,
    juni: 5,
    juli: 6,
    augustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    december: 11,
  };

  const textual = value.match(/\b(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})\b/i);
  if (textual) {
    return new Date(Number(textual[3]), months[normalize(textual[2])], Number(textual[1]));
  }

  const numeric = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (numeric) {
    return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
  }

  return null;
}

function inferDossierTopic(text: string, filename: string) {
  const source = `${text}\n${filename}`.toLowerCase();
  if (/(verzekering|polis|premie|dekking|schade|interpolis|asr|unive|ohra|zilveren kruis)/i.test(source)) return "Verzekeringen";
  if (/(woning|huur|hypotheek|gemeente|vastgoed|makelaar|vve)/i.test(source)) return "Wonen";
  if (/(zorg|huisarts|ziekenhuis|apotheek|medisch|tandarts|behandeling)/i.test(source)) return "Zorg";
  if (/(energie|stroom|gas|water|internet|telecom|kpn|ziggo|odido)/i.test(source)) return "Energie";
  return "";
}

function cleanTitleCandidate(candidate: string, fallback: string) {
  const compact = candidate
    .replace(/\s+/g, " ")
    .replace(/^(factuur|nota|polis|contract|overzicht|aanvraag|bevestiging)\s*[:-]?\s*/i, "")
    .trim();

  if (compact.length < 8) {
    return fallback;
  }

  return compact.slice(0, 140);
}

function firstMeaningfulLine(text: string, fallback: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidate =
    lines.find((line) => line.length > 8 && !/\b(postbus|www\.|iban|kvk|pagina\s+\d+)\b/i.test(line)) ??
    lines.find((line) => line.length > 8) ??
    fallback;

  return cleanTitleCandidate(candidate, fallback);
}

async function extractPdfText(sourcePath: string) {
  const data = await fs.readFile(sourcePath);
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText({ first: 1, last: 5 });
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function ocrImage(sourcePath: string) {
  const worker = await createWorker("nld+eng");

  try {
    const result = await worker.recognize(sourcePath);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

function extractIdentifiers(text: string) {
  const patterns = [
    /(?:factuurnummer|factuurnummer|invoice(?:\s+number)?)[\s:#-]*([A-Z0-9./-]{4,})/gi,
    /(?:polisnummer|polisnr|policy(?:\s+number)?)[\s:#-]*([A-Z0-9./-]{4,})/gi,
    /(?:contractnummer|contractnr|klantnummer|relatienummer)[\s:#-]*([A-Z0-9./-]{4,})/gi,
    /\b([A-Z]{2}\d{2}[A-Z0-9]{6,})\b/g,
  ];

  const values = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (value) {
        values.add(value);
      }
    }
  }

  return [...values].slice(0, 4);
}

function pickDates(text: string) {
  const matches = [
    ...text.matchAll(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g),
    ...text.matchAll(/\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}\b/gi),
  ]
    .map((match) => ({ value: match[0], index: match.index ?? 0 }))
    .map((match) => ({ ...match, date: parseDutchDate(match.value) }))
    .filter((match): match is { value: string; index: number; date: Date } => Boolean(match.date));

  const relevant = matches
    .filter((match) => match.date.getFullYear() >= 2000 && match.date.getFullYear() <= 2100)
    .sort((left, right) => left.index - right.index);

  const findNearKeyword = (keywords: RegExp) => {
    for (const match of relevant) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match.value.length + 50);
      const window = text.slice(start, end);
      if (keywords.test(window)) {
        return match.date;
      }
    }
    return null;
  };

  const documentDate =
    findNearKeyword(/\b(documentdatum|datum|opgemaakt|factuurdatum|polisdatum|ingangsdatum)\b/i) ?? relevant[0]?.date ?? null;
  const expiryDate =
    findNearKeyword(/\b(vervaldatum|geldig\s+tot|einddatum|looptijd\s+tot|tot en met)\b/i) ??
    (relevant.length > 1 ? relevant[relevant.length - 1].date : null);

  return { documentDate, expiryDate };
}

function buildNotes(text: string, identifiers: string[]) {
  const summaryLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12)
    .slice(0, 8)
    .join("\n");

  const identifierNote = identifiers.length ? `Herkenbare referenties: ${identifiers.join(", ")}` : "";
  return [identifierNote, summaryLines].filter(Boolean).join("\n\n").slice(0, 1500) || null;
}

function scoreNamedEntity(name: string, sourceText: string, filename: string) {
  const normalizedName = normalize(name);
  const normalizedSource = normalize(sourceText);
  const normalizedFilename = normalize(filename);

  let score = 0;
  if (normalizedSource.includes(normalizedName)) {
    score += 0.7;
  }
  if (normalizedFilename.includes(normalizedName)) {
    score += 0.35;
  }

  score += overlapScore(name, sourceText) * 0.45;
  score += overlapScore(name, filename) * 0.2;
  return score;
}

export async function analyzeImportDocument(input: {
  id: number;
  sourcePath: string;
  mimeType: string;
  originalFilename: string;
}) {
  const fallbackTitle = input.originalFilename.replace(/\.[^/.]+$/, "");
  const isPdf = input.mimeType.includes("pdf") || input.originalFilename.toLowerCase().endsWith(".pdf");
  const isImage = input.mimeType.startsWith("image/");

  if (!isPdf && !isImage) {
    await prisma.importDocument.update({
      where: { id: input.id },
      data: {
        status: ImportStatus.PENDING,
        ocrStatus: OcrStatus.UNSUPPORTED,
        draftTitle: fallbackTitle,
      },
    });
    return;
  }

  try {
    const extractedText = isPdf ? await extractPdfText(input.sourcePath) : await ocrImage(input.sourcePath);
    const text = extractedText.trim();
    const documentTypes = await prisma.documentType.findMany({ where: { isActive: true } });
    const contacts = await prisma.contact.findMany({ where: { deletedAt: null, isActive: true } });
    const documents = await prisma.document.findMany({
      where: { deletedAt: null, isLatestVersion: true },
      include: {
        documentType: true,
        contact: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    });

    const documentTypeCandidate = documentTypes
      .map((item) => ({
        item,
        score: scoreNamedEntity(item.name, text, input.originalFilename),
      }))
      .sort((left, right) => right.score - left.score)[0];

    const contactCandidate = contacts
      .map((item) => ({
        item,
        score: scoreNamedEntity(item.name, text, input.originalFilename),
      }))
      .sort((left, right) => right.score - left.score)[0];

    const identifiers = extractIdentifiers(text);
    const bestHistoricalMatch = documents
      .map((item) => ({
        item,
        score:
          Math.max(
            overlapScore(input.originalFilename, item.originalFilename),
            overlapScore(input.originalFilename, item.title),
            overlapScore(text.slice(0, 900), item.title),
            ...(identifiers.length ? identifiers.map((identifier) => overlapScore(identifier, `${item.title} ${item.originalFilename}`)) : [0]),
          ) + (item.contact?.name ? overlapScore(text.slice(0, 600), item.contact.name) * 0.2 : 0),
      }))
      .sort((left, right) => right.score - left.score)[0];

    const historicalDocumentType = bestHistoricalMatch?.score >= 0.38 ? bestHistoricalMatch.item.documentType : null;
    const historicalContact = bestHistoricalMatch?.score >= 0.38 ? bestHistoricalMatch.item.contact : null;
    const documentType = (documentTypeCandidate?.score ?? 0) >= 0.34 ? documentTypeCandidate.item : historicalDocumentType;
    const contact = (contactCandidate?.score ?? 0) >= 0.34 ? contactCandidate.item : historicalContact;
    const dates = pickDates(text);
    const inferredDossierTopic = inferDossierTopic(text, input.originalFilename);

    await prisma.importDocument.update({
      where: { id: input.id },
      data: {
        status: ImportStatus.PENDING,
        ocrStatus: text ? OcrStatus.SUCCESS : OcrStatus.ERROR,
        ocrText: text || null,
        draftTitle: firstMeaningfulLine(text, fallbackTitle),
        draftDocumentTypeId: documentType?.id ?? null,
        draftContactId: contact?.id ?? null,
        draftDocumentDate: dates.documentDate,
        draftExpiryDate: dates.expiryDate,
        draftDossierTopic:
          inferredDossierTopic !== ""
            ? inferredDossierTopic
            : (bestHistoricalMatch?.item.dossierTopic ?? defaultDossierOptions[0] ?? ""),
        draftNotes: buildNotes(text, identifiers),
        errorMessage: text ? null : "Er kon geen bruikbare tekst uit dit document worden gehaald.",
      },
    });
  } catch (error) {
    await prisma.importDocument.update({
      where: { id: input.id },
      data: {
        status: ImportStatus.PENDING,
        ocrStatus: OcrStatus.ERROR,
        draftTitle: fallbackTitle,
        errorMessage: error instanceof Error ? error.message : "OCR-analyse mislukt.",
      },
    });
  }
}
