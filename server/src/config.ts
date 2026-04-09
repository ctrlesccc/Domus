import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  isProduction: (process.env.NODE_ENV ?? "").toLowerCase() === "production",
  maxUploadSizeMb: parseNumber(process.env.MAX_UPLOAD_SIZE_MB, 15),
  storageRoot: path.resolve(process.cwd(), "..", "storage", "documents"),
  importRoot: path.resolve(process.cwd(), "..", "storage", "import"),
  databasePath: path.resolve(process.cwd(), "..", "prisma", "dev.db"),
  backupsRoot: path.resolve(process.cwd(), "..", "backups"),
};
