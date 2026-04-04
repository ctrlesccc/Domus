import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient, ContactKind, ContactTypeCategory, ObligationFrequency, UserRole } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
