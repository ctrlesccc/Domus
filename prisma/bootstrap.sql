PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  displayName TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  isActive BOOLEAN NOT NULL DEFAULT 1,
  lastLoginAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_types (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'BOTH',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  postalCode TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  contactTypeId INTEGER NOT NULL,
  kind TEXT NOT NULL,
  sendChristmasCard BOOLEAN NOT NULL DEFAULT 0,
  sendFuneralCard BOOLEAN NOT NULL DEFAULT 0,
  sendBirthdayCard BOOLEAN NOT NULL DEFAULT 0,
  birthDate DATETIME,
  notes TEXT,
  dossierTopic TEXT NOT NULL DEFAULT '',
  isActive BOOLEAN NOT NULL DEFAULT 1,
  deletedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contacts_contactTypeId_fkey FOREIGN KEY (contactTypeId) REFERENCES contact_types (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS document_types (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  originalFilename TEXT NOT NULL,
  storedFilename TEXT NOT NULL,
  storagePath TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  documentTypeId INTEGER NOT NULL,
  contactId INTEGER,
  expiryDate DATETIME,
  documentDate DATETIME,
  isImportant BOOLEAN NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  dossierTopic TEXT NOT NULL DEFAULT '',
  archivedAt DATETIME,
  deletedAt DATETIME,
  versionGroup TEXT NOT NULL DEFAULT '',
  versionNumber INTEGER NOT NULL DEFAULT 1,
  isLatestVersion BOOLEAN NOT NULL DEFAULT 1,
  previousVersionId INTEGER,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT documents_documentTypeId_fkey FOREIGN KEY (documentTypeId) REFERENCES document_types (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT documents_contactId_fkey FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT documents_previousVersionId_fkey FOREIGN KEY (previousVersionId) REFERENCES documents (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS document_contacts (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  documentId INTEGER NOT NULL,
  contactId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_contacts_documentId_fkey FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT document_contacts_contactId_fkey FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS obligation_types (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS obligations (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  obligationTypeId INTEGER NOT NULL,
  contactId INTEGER,
  contractNumber TEXT,
  amountInCents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  frequency TEXT NOT NULL,
  startDate DATETIME,
  endDate DATETIME,
  cancellationPeriodDays INTEGER,
  paymentMethod TEXT,
  autoRenew BOOLEAN NOT NULL DEFAULT 0,
  showOnDashboard BOOLEAN NOT NULL DEFAULT 0,
  reminderDate DATETIME,
  reviewDate DATETIME,
  plannedChargeDay INTEGER,
  plannedChargeMonth INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  dossierTopic TEXT NOT NULL DEFAULT '',
  deletedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT obligations_obligationTypeId_fkey FOREIGN KEY (obligationTypeId) REFERENCES obligation_types (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT obligations_contactId_fkey FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS obligation_documents (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  obligationId INTEGER NOT NULL,
  documentId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT obligation_documents_obligationId_fkey FOREIGN KEY (obligationId) REFERENCES obligations (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT obligation_documents_documentId_fkey FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  entityType TEXT NOT NULL,
  entityId INTEGER NOT NULL,
  action TEXT NOT NULL,
  actorUserId INTEGER,
  actorUsername TEXT,
  actorDisplayName TEXT,
  oldValue TEXT,
  newValue TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_documents (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  originalFilename TEXT NOT NULL,
  sourcePath TEXT NOT NULL UNIQUE,
  mimeType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  ocrStatus TEXT NOT NULL DEFAULT 'PENDING',
  ocrText TEXT,
  draftTitle TEXT,
  draftDocumentTypeId INTEGER,
  draftContactId INTEGER,
  draftDocumentDate DATETIME,
  draftExpiryDate DATETIME,
  draftDossierTopic TEXT NOT NULL DEFAULT '',
  draftNotes TEXT,
  errorMessage TEXT,
  discoveredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  importedAt DATETIME,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS obligation_documents_obligationId_documentId_key
ON obligation_documents(obligationId, documentId);
CREATE UNIQUE INDEX IF NOT EXISTS document_contacts_documentId_contactId_key
ON document_contacts(documentId, contactId);

CREATE INDEX IF NOT EXISTS contacts_contactTypeId_idx ON contacts(contactTypeId);
CREATE INDEX IF NOT EXISTS contacts_kind_idx ON contacts(kind);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON contacts(name);
CREATE INDEX IF NOT EXISTS contacts_city_idx ON contacts(city);
CREATE INDEX IF NOT EXISTS contacts_deletedAt_idx ON contacts(deletedAt);
CREATE INDEX IF NOT EXISTS documents_documentTypeId_idx ON documents(documentTypeId);
CREATE INDEX IF NOT EXISTS documents_contactId_idx ON documents(contactId);
CREATE INDEX IF NOT EXISTS documents_title_idx ON documents(title);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS documents_expiryDate_idx ON documents(expiryDate);
CREATE INDEX IF NOT EXISTS documents_deletedAt_idx ON documents(deletedAt);
CREATE INDEX IF NOT EXISTS documents_versionGroup_versionNumber_idx ON documents(versionGroup, versionNumber);
CREATE INDEX IF NOT EXISTS obligations_obligationTypeId_idx ON obligations(obligationTypeId);
CREATE INDEX IF NOT EXISTS obligations_contactId_idx ON obligations(contactId);
CREATE INDEX IF NOT EXISTS obligations_title_idx ON obligations(title);
CREATE INDEX IF NOT EXISTS obligations_status_idx ON obligations(status);
CREATE INDEX IF NOT EXISTS obligations_endDate_idx ON obligations(endDate);
CREATE INDEX IF NOT EXISTS obligations_showOnDashboard_idx ON obligations(showOnDashboard);
CREATE INDEX IF NOT EXISTS obligations_deletedAt_idx ON obligations(deletedAt);
CREATE INDEX IF NOT EXISTS document_contacts_documentId_idx ON document_contacts(documentId);
CREATE INDEX IF NOT EXISTS document_contacts_contactId_idx ON document_contacts(contactId);
CREATE INDEX IF NOT EXISTS obligation_documents_obligationId_idx ON obligation_documents(obligationId);
CREATE INDEX IF NOT EXISTS obligation_documents_documentId_idx ON obligation_documents(documentId);
CREATE INDEX IF NOT EXISTS audit_log_entityType_entityId_idx ON audit_log(entityType, entityId);
CREATE INDEX IF NOT EXISTS audit_log_createdAt_idx ON audit_log(createdAt);
CREATE INDEX IF NOT EXISTS import_documents_status_idx ON import_documents(status);
CREATE INDEX IF NOT EXISTS import_documents_discoveredAt_idx ON import_documents(discoveredAt);
