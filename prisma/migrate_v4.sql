PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS import_documents (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  originalFilename TEXT NOT NULL,
  sourcePath TEXT NOT NULL UNIQUE,
  mimeType TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  errorMessage TEXT,
  discoveredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  importedAt DATETIME,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS import_documents_status_idx ON import_documents(status);
CREATE INDEX IF NOT EXISTS import_documents_discoveredAt_idx ON import_documents(discoveredAt);
