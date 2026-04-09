# DOMUS

DOMUS is a self-hosted household administration app for managing documents, contacts, personal contacts, obligations, dashboard signals, and reference data.

Recent updates also improved the import intake: OCR now runs in a background queue, the import screen can trigger re-analysis, and the dashboard/import UI gives clearer live feedback while suggestions are being prepared.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Express + TypeScript
- Prisma + SQLite
- Filesystem document storage

## Quick start

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npm run db:bootstrap`.
5. Run `npm run prisma:seed`.
6. Run `npm run dev`.

If you already have an existing local database and update to a newer DOMUS version with schema changes, run the matching migration script as needed, for example `npm run db:migrate:v8`.

Recent versions also make local development startup more resilient by preparing missing database structures automatically before the server starts.

Default login:

- Username: `admin`
- Password: `Domus123!`

Uploaded files are stored in `storage/documents`.

## Notes

- The Prisma schema is included and Prisma Client is used by the app.
- Prisma CLI is configured via the root `prisma.config.ts` file.
- In this environment, Prisma schema-engine commands such as `migrate dev` and `db push` can fail for SQLite, so the initial database bootstrap is handled with `sqlite3` via `prisma/bootstrap.sql`.
- Existing Docker deployments apply bundled SQLite migration scripts during container startup when required.
- Administrative endpoints for settings, backups and reference data are restricted to administrator accounts.
- Import suggestions use asynchronous OCR/text extraction so uploads and folder scans stay responsive while the intake form is filled in progressively.
