PRAGMA foreign_keys = ON;

ALTER TABLE contacts ADD COLUMN deletedAt DATETIME;

ALTER TABLE documents ADD COLUMN archivedAt DATETIME;
ALTER TABLE documents ADD COLUMN deletedAt DATETIME;
ALTER TABLE documents ADD COLUMN versionGroup TEXT;
ALTER TABLE documents ADD COLUMN versionNumber INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN isLatestVersion BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN previousVersionId INTEGER;

UPDATE documents
SET versionGroup = COALESCE(NULLIF(versionGroup, ''), 'legacy-' || id)
WHERE versionGroup IS NULL OR versionGroup = '';

CREATE TABLE IF NOT EXISTS document_contacts (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  documentId INTEGER NOT NULL,
  contactId INTEGER NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT document_contacts_documentId_fkey FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT document_contacts_contactId_fkey FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT OR IGNORE INTO document_contacts (documentId, contactId, createdAt)
SELECT id, contactId, CURRENT_TIMESTAMP
FROM documents
WHERE contactId IS NOT NULL;

ALTER TABLE obligations ADD COLUMN deletedAt DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS document_contacts_documentId_contactId_key
ON document_contacts(documentId, contactId);
CREATE INDEX IF NOT EXISTS contacts_deletedAt_idx ON contacts(deletedAt);
CREATE INDEX IF NOT EXISTS documents_deletedAt_idx ON documents(deletedAt);
CREATE INDEX IF NOT EXISTS documents_versionGroup_versionNumber_idx ON documents(versionGroup, versionNumber);
CREATE INDEX IF NOT EXISTS obligations_deletedAt_idx ON obligations(deletedAt);
CREATE INDEX IF NOT EXISTS document_contacts_documentId_idx ON document_contacts(documentId);
CREATE INDEX IF NOT EXISTS document_contacts_contactId_idx ON document_contacts(contactId);
