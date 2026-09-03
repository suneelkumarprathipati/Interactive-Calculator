/**
 * History store — persistence for completed calculations.
 *
 * In production you would use Postgres, SQLite, or Redis.
 * For this teaching project we keep two implementations with
 * the same interface so the HTTP layer does not care which one
 * you plug in:
 *
 *   list()        -> items newest-first
 *   add(item)     -> items
 *   clear()       -> []
 *
 * That interface is the "repository" idea: swap the storage,
 * keep the routes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_LIMIT = 20;

export function createMemoryHistoryStore(limit = DEFAULT_LIMIT) {
  let items = [];

  return {
    list() {
      return [...items];
    },
    load(next) {
      items = Array.isArray(next) ? next.slice(0, limit) : [];
      return this.list();
    },
    add(item) {
      items = [item, ...items].slice(0, limit);
      return this.list();
    },
    clear() {
      items = [];
      return [];
    },
  };
}

export function createFileHistoryStore({
  filePath = path.resolve("data/history.json"),
  limit = DEFAULT_LIMIT,
} = {}) {
  const memory = createMemoryHistoryStore(limit);

  if (existsSync(filePath)) {
    try {
      memory.load(JSON.parse(readFileSync(filePath, "utf8")));
    } catch {
      memory.load([]);
    }
  }

  function persist() {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(memory.list(), null, 2)}\n`);
  }

  return {
    list: () => memory.list(),
    add(item) {
      const next = memory.add(item);
      persist();
      return next;
    },
    clear() {
      const next = memory.clear();
      persist();
      return next;
    },
  };
}

export function createHistoryItem({ expression, result }) {
  return {
    id: crypto.randomUUID(),
    expression,
    result,
    createdAt: new Date().toISOString(),
  };
}
