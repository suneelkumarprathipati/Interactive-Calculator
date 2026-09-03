/**
 * Express application — the HTTP adapter.
 *
 * Routes are thin: validate JSON, call shared/math.js, store history.
 * If you ever replace Express with Fastify or Nest, you rewrite this
 * file, not the math engine.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import {
  BINARY_OPERATORS,
  UNARY_OPERATIONS,
  computeBinary,
  computeUnary,
  describeBinary,
  describeUnary,
  formatNumber,
} from "../shared/math.js";
import { createFileHistoryStore, createHistoryItem } from "./historyStore.js";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultDist = path.join(rootDir, "dist");

function sendError(res, status, error) {
  res.status(status).json({ error });
}

function record(store, expression, value) {
  const item = createHistoryItem({
    expression,
    result: formatNumber(value),
  });
  const history = store.add(item);
  return {
    result: value,
    formatted: item.result,
    historyItem: item,
    history,
  };
}

export function createApp({
  store = createFileHistoryStore(),
  staticDir = existsSync(defaultDist) ? defaultDist : null,
} = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`);
      }
    });
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "interactive-calculator",
      time: new Date().toISOString(),
    });
  });

  app.get("/api/history", (_req, res) => {
    res.json({ history: store.list() });
  });

  app.delete("/api/history", (_req, res) => {
    res.json({ history: store.clear() });
  });

  app.post("/api/compute", (req, res) => {
    const { left, operator, right } = req.body ?? {};

    if (!BINARY_OPERATORS.includes(operator)) {
      return sendError(res, 400, "Operator must be one of + - * /");
    }

    const outcome = computeBinary(left, operator, right);
    if (!outcome.ok) {
      return sendError(res, 400, outcome.error);
    }

    res.json(record(store, describeBinary(left, operator, right), outcome.value));
  });

  app.post("/api/unary", (req, res) => {
    const { operation, value, base } = req.body ?? {};

    if (!UNARY_OPERATIONS.includes(operation)) {
      return sendError(res, 400, "Unknown unary operation");
    }

    const outcome = computeUnary(operation, value, base);
    if (!outcome.ok) {
      return sendError(res, 400, outcome.error);
    }

    res.json(record(store, describeUnary(operation, value), outcome.value));
  });

  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use((req, res) => {
    sendError(res, 404, `No route for ${req.method} ${req.path}`);
  });

  return app;
}
