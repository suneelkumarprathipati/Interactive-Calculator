import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Vite is the frontend dev server and bundler.
 *
 * During `npm run dev`, the browser talks to Vite on port 5173.
 * Any request that starts with /api is forwarded to Express on 3001.
 * That is why the frontend can call `/api/compute` without hard-coding
 * a host — same path in development and in production.
 *
 * `npm run build` writes static files to /dist. `npm start` then
 * lets Express serve those files and the API from one process.
 */

const clientRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: clientRoot,
  publicDir: path.join(clientRoot, "public"),
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [path.resolve(clientRoot, "..")],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(clientRoot, "../dist"),
    emptyOutDir: true,
  },
});
