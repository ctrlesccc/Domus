import type {
  Contact,
  ContactType,
  Document,
  DocumentContact,
  DocumentType,
  Obligation,
  ObligationDocument,
  ObligationType,
} from "@prisma/client";

type ContactWithType = Contact & { contactType: ContactType };
type DocumentWithRelations = Document & {
  documentType: DocumentType;
  contact: Contact | null;
  documentContacts?: (DocumentContact & { contact: Contact })[];
  obligationDocuments?: (ObligationDocument & { obligation: Obligation })[];
};
type ObligationWithRelations = Obligation & {
  obligationType: ObligationType;
  contact: Contact | null;
  obligationDocuments?: (ObligationDocument & { document: Document })[];
};

export function serializeContact(contact: ContactWithType) {
  return {
    ...contact,
    contactType: {
      id: contact.contactType.id,
      name: contact.contactType.name,
      category: contact.contactType.category,
    },
  };
}

export function serializeDocument(document: DocumentWithRelations) {
  return {
    ...document,
    downloadUrl: `/api/documents/${document.id}/download`,
    previewUrl: `/api/documents/${document.id}/preview`,
    linkedContacts:
      document.documentContacts?.map((item) => ({
        id: item.contact.id,
        name: item.contact.name,
        email: item.contact.email,
        city: item.contact.city,
      })) ?? [],
    obligationIds: document.obligationDocuments?.map((item) => item.obligationId) ?? [],
    versionInfo: {
      versionGroup: document.versionGroup,
      versionNumber: document.versionNumber,
      isLatestVersion: document.isLatestVersion,
      previousVersionId: document.previousVersionId,
      archivedAt: document.archivedAt,
      deletedAt: document.deletedAt,
    },
  };
}

export function serializeObligation(obligation: ObligationWithRelations) {
  return {
    ...obligation,
    amount: obligation.amountInCents / 100,
    documentIds: obligation.obligationDocuments?.map((item) => item.documentId) ?? [],
  };
}
