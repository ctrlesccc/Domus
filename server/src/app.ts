import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";

export async function createApp() {
  const app = express();
  const serverDistDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(serverDistDir, "..", "..", "client", "dist");

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const { authRouter } = await import("./routes/auth.js");
  const { dashboardRouter } = await import("./routes/dashboard.js");
  const { searchRouter } = await import("./routes/search.js");
  const { contactsRouter } = await import("./routes/contacts.js");
  const { contactTypesRouter } = await import("./routes/contact-types.js");
  const { documentTypesRouter } = await import("./routes/document-types.js");
  const { obligationTypesRouter } = await import("./routes/obligation-types.js");
  const { documentsRouter } = await import("./routes/documents.js");
  const { obligationsRouter } = await import("./routes/obligations.js");
  const { settingsRouter } = await import("./routes/settings.js");
  const { usersRouter } = await import("./routes/users.js");
  const { trashRouter } = await import("./routes/trash.js");
  const { backupsRouter } = await import("./routes/backups.js");
  const { auditRouter } = await import("./routes/audit.js");
  const { planningRouter } = await import("./routes/planning.js");
  const { dossiersRouter } = await import("./routes/dossiers.js");
  const { importsRouter } = await import("./routes/imports.js");

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/contact-types", contactTypesRouter);
  app.use("/api/document-types", documentTypesRouter);
  app.use("/api/obligation-types", obligationTypesRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/obligations", obligationsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/trash", trashRouter);
  app.use("/api/backups", backupsRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/planning", planningRouter);
  app.use("/api/dossiers", dossiersRouter);
  app.use("/api/imports", importsRouter);

  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_request, response) => {
      response.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
