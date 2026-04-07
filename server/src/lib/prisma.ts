import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { config } from "../config.js";

const toPosixPath = (value: string) => value.replace(/\\/g, "/");

const resolveDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return `file:${toPosixPath(config.databasePath)}`;
  }

  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const filePath = databaseUrl.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return `file:${toPosixPath(filePath)}`;
  }

  return `file:${toPosixPath(path.resolve(path.dirname(config.databasePath), filePath))}`;
};

const adapter = new PrismaBetterSqlite3({
  url: resolveDatabaseUrl(),
});

export const prisma = new PrismaClient({ adapter });
