/**
 * Process entry point. createApp() is imported by tests without
 * opening a port. This file is what `npm run dev:server` starts.
 */

import { createApp } from "./app.js";
import { createFileHistoryStore } from "./historyStore.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const app = createApp({
  store: createFileHistoryStore(),
});

app.listen(PORT, HOST, () => {
  console.log(`Calculator API ready at http://localhost:${PORT}`);
  console.log("Try: curl http://localhost:3001/api/health");
});
