import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

export const backupsRouter = Router();

backupsRouter.use(requireAuth);

async function ensureBackupsRoot() {
  await fs.mkdir(config.backupsRoot, { recursive: true });
}

async function folderSize(targetPath: string): Promise<number> {
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      total += await folderSize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      total += stats.size;
    }
  }

  return total;
}

backupsRouter.get("/", async (_request, response) => {
  await ensureBackupsRoot();
  const dbStats = await fs.stat(config.databasePath).catch(() => null);
  const storageSize = await folderSize(path.resolve(config.storageRoot, "..")).catch(() => 0);
  const entries = await fs.readdir(config.backupsRoot, { withFileTypes: true });

  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const fullPath = path.join(config.backupsRoot, entry.name);
        const stats = await fs.stat(fullPath);
        const size = await folderSize(fullPath);
        return {
          name: entry.name,
          path: fullPath,
          createdAt: stats.birthtime.toISOString(),
          size,
        };
      }),
  );

  backups.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return response.json({
    overview: {
      databasePath: config.databasePath,
      databaseLastModified: dbStats?.mtime.toISOString() ?? null,
      storageRoot: config.storageRoot,
      storageSize,
    },
    backups,
  });
});

backupsRouter.post("/", async (_request, response) => {
  await ensureBackupsRoot();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.join(config.backupsRoot, `domus-backup-${timestamp}`);
  const targetStorage = path.join(targetDir, "storage");
  const targetDatabase = path.join(targetDir, "dev.db");

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(config.databasePath, targetDatabase);
  await fs.cp(path.resolve(config.storageRoot, ".."), targetStorage, { recursive: true });

  return response.status(201).json({
    name: path.basename(targetDir),
    path: targetDir,
  });
});
