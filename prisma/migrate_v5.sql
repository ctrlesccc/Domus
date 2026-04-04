PRAGMA foreign_keys = ON;

ALTER TABLE import_documents ADD COLUMN ocrStatus TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE import_documents ADD COLUMN ocrText TEXT;
ALTER TABLE import_documents ADD COLUMN draftTitle TEXT;
ALTER TABLE import_documents ADD COLUMN draftDocumentTypeId INTEGER;
ALTER TABLE import_documents ADD COLUMN draftContactId INTEGER;
ALTER TABLE import_documents ADD COLUMN draftDocumentDate DATETIME;
ALTER TABLE import_documents ADD COLUMN draftExpiryDate DATETIME;
ALTER TABLE import_documents ADD COLUMN draftDossierTopic TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE import_documents ADD COLUMN draftNotes TEXT;

UPDATE import_documents
SET status = 'PENDING'
WHERE status = 'DRAFT';
