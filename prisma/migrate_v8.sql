PRAGMA foreign_keys = ON;

ALTER TABLE documents ADD COLUMN isImportant BOOLEAN NOT NULL DEFAULT 0;
