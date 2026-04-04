import { createApp } from "./app.js";
import { config } from "./config.js";
import { startImportWatcher } from "./lib/import-watcher.js";
import { ensureStorageDirectory } from "./lib/storage.js";

async function main() {
  await ensureStorageDirectory();
  await startImportWatcher();
  const app = await createApp();
  app.listen(config.port, () => {
    console.log(`DOMUS API listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
