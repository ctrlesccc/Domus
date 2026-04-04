import fs from "node:fs/promises";
import { DossierTopic, ImportStatus, OcrStatus } from "@prisma/client";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import { prisma } from "./prisma.js";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
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

function normalize(value: string) {
  return value.toLowerCase();
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
  if (/(verzekering|polis|premie|reaal|asr|interpolis)/i.test(source)) return "VERZEKERINGEN";
  if (/(woning|huur|hypotheek|gemeente|vastgoed)/i.test(source)) return "WONEN";
  if (/(zorg|huisarts|ziekenhuis|apotheek|medisch|tandarts)/i.test(source)) return "ZORG";
  if (/(energie|stroom|gas|water|internet|telecom)/i.test(source)) return "ENERGIE";
  return "NONE";
}

function firstMeaningfulLine(text: string, fallback: string) {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 8 && !/\b(postbus|www\.|iban|kvk)\b/i.test(line)) ?? fallback
  );
}

async function extractPdfText(sourcePath: string) {
  const data = await fs.readFile(sourcePath);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText({ first: 1, last: 2 });
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
      take: 60,
    });

    const lowerText = text.toLowerCase();
    const directDocumentType = documentTypes.find((item) => lowerText.includes(item.name.toLowerCase()));
    const directContact = contacts.find((item) => lowerText.includes(item.name.toLowerCase()));
    const bestHistoricalMatch = documents
      .map((item) => ({
        item,
        score: Math.max(
          overlapScore(input.originalFilename, item.originalFilename),
          overlapScore(input.originalFilename, item.title),
          overlapScore(text.slice(0, 250), item.title),
        ),
      }))
      .sort((left, right) => right.score - left.score)[0];

    const historicalDocumentType = bestHistoricalMatch?.score >= 0.34 ? bestHistoricalMatch.item.documentType : null;
    const historicalContact = bestHistoricalMatch?.score >= 0.34 ? bestHistoricalMatch.item.contact : null;
    const documentType = directDocumentType ?? historicalDocumentType ?? null;
    const contact = directContact ?? historicalContact ?? null;
    const matchedDates = [
      ...text.matchAll(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g),
      ...text.matchAll(/\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4}\b/gi),
    ]
      .map((match) => parseDutchDate(match[0]))
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => left.getTime() - right.getTime());

    await prisma.importDocument.update({
      where: { id: input.id },
      data: {
        status: ImportStatus.PENDING,
        ocrStatus: OcrStatus.SUCCESS,
        ocrText: text || null,
        draftTitle: firstMeaningfulLine(text, fallbackTitle),
        draftDocumentTypeId: documentType?.id ?? null,
        draftContactId: contact?.id ?? null,
        draftDocumentDate: matchedDates[0] ?? null,
        draftExpiryDate: matchedDates.length > 1 ? matchedDates[matchedDates.length - 1] : null,
        draftDossierTopic: (
          inferDossierTopic(text, input.originalFilename) !== "NONE"
            ? inferDossierTopic(text, input.originalFilename)
            : (bestHistoricalMatch?.item.dossierTopic ?? "NONE")
        ) as DossierTopic,
        draftNotes: text ? text.slice(0, 1500) : null,
        errorMessage: null,
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
