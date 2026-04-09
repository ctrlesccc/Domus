import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { ContactKind, ContactTypeCategory, ObligationFrequency, UserRole } from "@prisma/client";
import fs from "node:fs/promises";
import { prisma } from "./prisma.js";
import { config } from "../config.js";

function openDatabase() {
  return new Database(config.databasePath);
}

type SqliteDatabase = ReturnType<typeof openDatabase>;

function tableExists(database: SqliteDatabase, tableName: string) {
  const row = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name?: string } | undefined;

  return Boolean(row?.name);
}

function columnExists(database: SqliteDatabase, tableName: string, columnName: string) {
  if (!tableExists(database, tableName)) {
    return false;
  }

  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return columns.some((column) => column.name === columnName);
}

async function runSqlFile(database: SqliteDatabase, relativePath: string) {
  const absolutePath = new URL(`../../../${relativePath}`, import.meta.url);
  const sql = await fs.readFile(absolutePath, "utf8");
  database.exec(sql);
}

async function ensureSeedData() {
  const username = process.env.DEFAULT_ADMIN_USERNAME ?? "admin";
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? "Domus123!";
  const displayName = process.env.DEFAULT_ADMIN_DISPLAY_NAME ?? "DOMUS Beheerder";

  await prisma.user.upsert({
    where: { username },
    update: {
      displayName,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      username,
      displayName,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const contactTypes = [
    ["Verzekeraar", ContactTypeCategory.BUSINESS],
    ["Huisarts", ContactTypeCategory.BUSINESS],
    ["Internetprovider", ContactTypeCategory.BUSINESS],
    ["Gemeente", ContactTypeCategory.BUSINESS],
    ["Familie", ContactTypeCategory.PERSONAL],
    ["Vrienden", ContactTypeCategory.PERSONAL],
    ["Buren", ContactTypeCategory.PERSONAL],
  ] as const;

  for (const [index, [name, category]] of contactTypes.entries()) {
    await prisma.contactType.upsert({
      where: { name },
      update: { category, sortOrder: index },
      create: { name, category, sortOrder: index },
    });
  }

  const documentTypes = ["Polis", "Contract", "Factuur", "Garantiebewijs", "Handleiding", "Persoonlijk"];
  for (const [index, name] of documentTypes.entries()) {
    await prisma.documentType.upsert({
      where: { name },
      update: { sortOrder: index },
      create: { name, sortOrder: index },
    });
  }

  const obligationTypes = ["Verzekering", "Abonnement", "Hypotheek", "Energie", "Internet"];
  for (const [index, name] of obligationTypes.entries()) {
    await prisma.obligationType.upsert({
      where: { name },
      update: { sortOrder: index },
      create: { name, sortOrder: index },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "dashboard.expiryWindowDays" },
    update: { value: "30" },
    create: { key: "dashboard.expiryWindowDays", value: "30" },
  });
  await prisma.appSetting.upsert({
    where: { key: "options.dossiers" },
    update: { value: JSON.stringify(["Verzekeringen", "Wonen", "Zorg", "Energie", "Overig"]) },
    create: { key: "options.dossiers", value: JSON.stringify(["Verzekeringen", "Wonen", "Zorg", "Energie", "Overig"]) },
  });
  await prisma.appSetting.upsert({
    where: { key: "options.paymentMethods" },
    update: { value: JSON.stringify(["Incasso", "Contant", "Creditcard", "Paypal"]) },
    create: { key: "options.paymentMethods", value: JSON.stringify(["Incasso", "Contant", "Creditcard", "Paypal"]) },
  });

  const insurerType = await prisma.contactType.findUniqueOrThrow({ where: { name: "Verzekeraar" } });
  const familyType = await prisma.contactType.findUniqueOrThrow({ where: { name: "Familie" } });
  const insuranceObligationType = await prisma.obligationType.findUniqueOrThrow({ where: { name: "Verzekering" } });

  const insurer = await prisma.contact.upsert({
    where: { id: 1 },
    update: {
      name: "Voorbeeld Verzekeraar",
      city: "Utrecht",
      email: "service@voorbeeldverzekeraar.nl",
      contactTypeId: insurerType.id,
      kind: ContactKind.BUSINESS,
      dossierTopic: "Verzekeringen",
    },
    create: {
      name: "Voorbeeld Verzekeraar",
      city: "Utrecht",
      email: "service@voorbeeldverzekeraar.nl",
      contactTypeId: insurerType.id,
      kind: ContactKind.BUSINESS,
      dossierTopic: "Verzekeringen",
    },
  });

  await prisma.contact.upsert({
    where: { id: 2 },
    update: {
      name: "Jan Jansen",
      city: "Amersfoort",
      contactTypeId: familyType.id,
      kind: ContactKind.PERSONAL,
      birthDate: new Date("1988-09-14"),
      dossierTopic: "Overig",
      sendChristmasCard: true,
      sendBirthdayCard: true,
    },
    create: {
      name: "Jan Jansen",
      city: "Amersfoort",
      contactTypeId: familyType.id,
      kind: ContactKind.PERSONAL,
      birthDate: new Date("1988-09-14"),
      dossierTopic: "Overig",
      sendChristmasCard: true,
      sendBirthdayCard: true,
    },
  });

  await prisma.obligation.upsert({
    where: { id: 1 },
    update: {
      title: "Inboedelverzekering",
      obligationTypeId: insuranceObligationType.id,
      contactId: insurer.id,
      amountInCents: 1499,
      frequency: ObligationFrequency.MONTHLY,
      dossierTopic: "Verzekeringen",
      showOnDashboard: true,
      status: "ACTIVE",
    },
    create: {
      title: "Inboedelverzekering",
      obligationTypeId: insuranceObligationType.id,
      contactId: insurer.id,
      amountInCents: 1499,
      frequency: ObligationFrequency.MONTHLY,
      dossierTopic: "Verzekeringen",
      showOnDashboard: true,
      status: "ACTIVE",
    },
  });
}

export async function ensureDatabaseReady() {
  const database = openDatabase();
  let seededFreshDatabase = false;

  try {
    if (!tableExists(database, "users")) {
      await runSqlFile(database, "prisma/bootstrap.sql");
      seededFreshDatabase = true;
    }

    if (!columnExists(database, "contacts", "birthDate")) {
      await runSqlFile(database, "prisma/migrate_v3.sql");
    }

    if (!tableExists(database, "import_documents")) {
      await runSqlFile(database, "prisma/migrate_v4.sql");
    }

    if (!columnExists(database, "import_documents", "ocrStatus")) {
      await runSqlFile(database, "prisma/migrate_v5.sql");
    }

    if (!columnExists(database, "users", "role")) {
      await runSqlFile(database, "prisma/migrate_v6.sql");
    }

    if (!columnExists(database, "obligations", "plannedChargeDay")) {
      await runSqlFile(database, "prisma/migrate_v7.sql");
    }

    if (!columnExists(database, "documents", "isImportant")) {
      await runSqlFile(database, "prisma/migrate_v8.sql");
    }
  } finally {
    database.close();
  }

  if (seededFreshDatabase) {
    await ensureSeedData();
  }
}
