# DOMUS

DOMUS is a self-hosted household administration app for managing documents, contacts, personal contacts, obligations, dashboard signals, and reference data.

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

Default login:

- Username: `admin`
- Password: `Domus123!`

Uploaded files are stored in `storage/documents`.

## Notes

- The Prisma schema is included and Prisma Client is used by the app.
- In this environment, Prisma schema-engine commands such as `migrate dev` and `db push` can fail for SQLite, so the initial database bootstrap is handled with `sqlite3` via `prisma/bootstrap.sql`.
