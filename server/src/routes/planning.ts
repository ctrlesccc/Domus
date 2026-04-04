import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const planningRouter = Router();

planningRouter.use(requireAuth);

planningRouter.get("/", async (_request, response) => {
  const [documents, obligations, contacts] = await Promise.all([
    prisma.document.findMany({
      where: {
        deletedAt: null,
        isLatestVersion: true,
        OR: [{ expiryDate: { not: null } }, { documentDate: { not: null } }],
      },
      include: {
        documentType: true,
        contact: true,
      },
      orderBy: [{ expiryDate: "asc" }, { documentDate: "asc" }],
    }),
    prisma.obligation.findMany({
      where: {
        deletedAt: null,
        OR: [{ endDate: { not: null } }, { reviewDate: { not: null } }, { reminderDate: { not: null } }],
      },
      include: {
        obligationType: true,
        contact: true,
      },
      orderBy: [{ endDate: "asc" }, { reviewDate: "asc" }, { reminderDate: "asc" }],
    }),
    prisma.contact.findMany({
      where: {
        deletedAt: null,
        birthDate: { not: null },
        kind: "PERSONAL",
      },
      include: {
        contactType: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const documentEvents = documents.flatMap((document) => {
    const events: Array<{
      id: string;
      date: Date;
      category: "DOCUMENT" | "OBLIGATION";
      kind: string;
      title: string;
      subtitle: string;
      relatedName: string | null;
      href: string;
    }> = [];

    if (document.expiryDate) {
      events.push({
        id: `document-expiry-${document.id}`,
        date: document.expiryDate,
        category: "DOCUMENT",
        kind: "Vervaldatum",
        title: document.title,
        subtitle: document.documentType.name,
        relatedName: document.contact?.name ?? null,
        href: `/documents/${document.id}`,
      });
    }

    if (document.documentDate) {
      events.push({
        id: `document-date-${document.id}`,
        date: document.documentDate,
        category: "DOCUMENT",
        kind: "Documentdatum",
        title: document.title,
        subtitle: document.documentType.name,
        relatedName: document.contact?.name ?? null,
        href: `/documents/${document.id}`,
      });
    }

    return events;
  });

  const obligationEvents = obligations.flatMap((obligation) => {
    const events: Array<{
      id: string;
      date: Date;
      category: "DOCUMENT" | "OBLIGATION";
      kind: string;
      title: string;
      subtitle: string;
      relatedName: string | null;
      href: string;
    }> = [];

    if (obligation.endDate) {
      events.push({
        id: `obligation-end-${obligation.id}`,
        date: obligation.endDate,
        category: "OBLIGATION",
        kind: "Einddatum",
        title: obligation.title,
        subtitle: obligation.obligationType.name,
        relatedName: obligation.contact?.name ?? null,
        href: `/obligations/${obligation.id}`,
      });
    }

    if (obligation.reviewDate) {
      events.push({
        id: `obligation-review-${obligation.id}`,
        date: obligation.reviewDate,
        category: "OBLIGATION",
        kind: "Evaluatie",
        title: obligation.title,
        subtitle: obligation.obligationType.name,
        relatedName: obligation.contact?.name ?? null,
        href: `/obligations/${obligation.id}`,
      });
    }

    if (obligation.reminderDate) {
      events.push({
        id: `obligation-reminder-${obligation.id}`,
        date: obligation.reminderDate,
        category: "OBLIGATION",
        kind: "Herinnering",
        title: obligation.title,
        subtitle: obligation.obligationType.name,
        relatedName: obligation.contact?.name ?? null,
        href: `/obligations/${obligation.id}`,
      });
    }

    return events;
  });

  const contactEvents = contacts.flatMap((contact) => {
    if (!contact.birthDate) {
      return [];
    }

    const birthDate = new Date(contact.birthDate);
    const today = new Date();
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    return [
      {
        id: `contact-birthday-${contact.id}`,
        date: nextBirthday,
        category: "CONTACT" as const,
        kind: "Verjaardag",
        title: contact.name,
        subtitle: contact.contactType.name,
        relatedName: contact.city ?? null,
        href: `/personal-contacts/${contact.id}`,
      },
    ];
  });

  const events = [...documentEvents, ...obligationEvents, ...contactEvents]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .map((event) => ({
      ...event,
      date: event.date.toISOString(),
    }));

  return response.json({
    upcoming: events,
    counts: {
      documents: events.filter((event) => event.category === "DOCUMENT").length,
      obligations: events.filter((event) => event.category === "OBLIGATION").length,
      contacts: events.filter((event) => event.category === "CONTACT").length,
    },
  });
});
