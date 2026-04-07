import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const defaultDatabaseUrl = `file:${path.join("prisma", "dev.db").replace(/\\/g, "/")}`;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
