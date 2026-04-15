export type User = {
  id?: number;
  userId: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
  isActive?: boolean;
  lastLoginAt?: string | null;
};

export type ManagedUser = {
  id: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferenceItem = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  category?: "BUSINESS" | "PERSONAL" | "BOTH";
};

export type Contact = {
  id: number;
  name: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  contactTypeId: number;
  kind: "BUSINESS" | "PERSONAL";
  sendChristmasCard: boolean;
  sendFuneralCard: boolean;
  sendBirthdayCard: boolean;
  birthDate?: string | null;
  notes?: string | null;
  dossierTopic: string;
  isActive: boolean;
  contactType: {
    id: number;
    name: string;
    category: "BUSINESS" | "PERSONAL" | "BOTH";
  };
};

export type DocumentItem = {
  id: number;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  documentTypeId: number;
  contactId?: number | null;
  expiryDate?: string | null;
  documentDate?: string | null;
  isImportant: boolean;
  status: "ACTIVE" | "EXPIRED" | "ARCHIVED";
  notes?: string | null;
  dossierTopic: string;
  createdAt: string;
  updatedAt: string;
  documentType: ReferenceItem;
  contact?: Contact | null;
  linkedContacts: {
    id: number;
    name: string;
    email?: string | null;
    city?: string | null;
  }[];
  obligationIds: number[];
  downloadUrl: string;
  previewUrl: string;
  versionInfo: {
    versionGroup: string;
    versionNumber: number;
    isLatestVersion: boolean;
    previousVersionId?: number | null;
    archivedAt?: string | null;
    deletedAt?: string | null;
  };
  versionHistory?: DocumentItem[];
};

export type Obligation = {
  id: number;
  title: string;
  obligationTypeId: number;
  contactId?: number | null;
  contractNumber?: string | null;
  amount: number;
  currency: string;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
  startDate?: string | null;
  endDate?: string | null;
  cancellationPeriodDays?: number | null;
  paymentMethod?: string | null;
  autoRenew: boolean;
  showOnDashboard: boolean;
  reminderDate?: string | null;
  reviewDate?: string | null;
  plannedChargeDay?: number | null;
  plannedChargeMonth?: number | null;
  status: "ACTIVE" | "ENDED" | "EXPIRED";
  notes?: string | null;
  dossierTopic: string;
  contact?: Contact | null;
  obligationType: ReferenceItem;
  documentIds: number[];
};

export type DashboardData = {
  stats: {
    documentCount: number;
    contactCount: number;
    personalContactCount: number;
    obligationCount: number;
    activeObligationCount: number;
    importQueueCount: number;
  };
  documentsExpiringSoon: DocumentItem[];
  obligationsEndingSoon: Obligation[];
  importantDocuments: DocumentItem[];
  upcomingPlannedCharges: (Obligation & { plannedDate: string })[];
  planningWindowDays: number;
  dossierOptions: string[];
  activePolicies: {
    id: number;
    title: string;
    contactName: string;
    obligations: {
      id: number;
      title: string;
      amount: number;
      currency: string;
    }[];
    downloadUrl: string;
  }[];
  policyGroups: {
    insurer: string;
    policies: {
      id: number;
      title: string;
      contactName: string;
      obligations: {
        id: number;
        title: string;
        amount: number;
        currency: string;
      }[];
      downloadUrl: string;
    }[];
  }[];
  costSummary: {
    monthly: number;
    yearly: number;
  };
  annualCostByType: {
    typeName: string;
    count: number;
    monthly: number;
    yearly: number;
    obligations: Obligation[];
  }[];
  missingData: {
    documentsWithoutDate: {
      id: number;
      title: string;
      downloadUrl: string;
    }[];
    obligationsWithoutAmount: {
      id: number;
      title: string;
    }[];
  };
  importQueue: ImportItem[];
};

export type NavigationCounts = {
  dossierCount: number;
  documentCount: number;
  contactCount: number;
  personalContactCount: number;
  obligationCount: number;
  importQueueCount: number;
};

export type BackupOverview = {
  overview: {
    databasePath: string;
    databaseLastModified: string | null;
    storageRoot: string;
    storageSize: number;
  };
  backups: {
    name: string;
    path: string;
    createdAt: string;
    size: number;
  }[];
};

export type TrashOverview = {
  documents: DocumentItem[];
  obligations: Obligation[];
  contacts: Contact[];
};

export type SearchResults = {
  documents: DocumentItem[];
  contacts: Contact[];
  obligations: Obligation[];
};

export type AppSetting = {
  id: number;
  key: string;
  value: string;
};

export type DossierOverview = {
  dossiers: {
    key: string;
    title: string;
    summary: string;
    documents: DocumentItem[];
    obligations: Obligation[];
    contacts: Contact[];
  }[];
};

export type AuditEntry = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  actorUserId?: number | null;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

export type ImportItem = {
  id: number;
  originalFilename: string;
  sourcePath: string;
  mimeType: string;
  fileSize: number;
  status: "PENDING" | "IMPORTED" | "ERROR";
  ocrStatus: "PENDING" | "SUCCESS" | "ERROR" | "UNSUPPORTED";
  ocrText?: string | null;
  draftTitle?: string | null;
  draftDocumentTypeId?: number | null;
  draftContactId?: number | null;
  draftDocumentDate?: string | null;
  draftExpiryDate?: string | null;
  draftDossierTopic?: string;
  draftNotes?: string | null;
  errorMessage?: string | null;
  discoveredAt: string;
  importedAt?: string | null;
  updatedAt: string;
  analysis: {
    confidence: {
      title: number;
      documentType: number;
      contact: number;
      documentDate: number;
      expiryDate: number;
      overall: number;
    };
    warnings: string[];
    signals: string[];
    identifiers: string[];
  };
  previewUrl: string;
  downloadUrl: string;
};
