import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createMemoryHistoryStore } from "./historyStore.js";

async function withServer(fn) {
  const app = createApp({ store: createMemoryHistoryStore(), staticDir: null });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health check reports the service is up", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "interactive-calculator");
  });
});

test("compute stores a history item the client can replay", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left: 12, operator: "+", right: 7 }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.result, 19);
    assert.equal(body.formatted, "19");
    assert.equal(body.history[0].expression, "12 + 7");

    const listed = await fetch(`${base}/api/history`);
    const history = await listed.json();
    assert.equal(history.history.length, 1);
  });
});

test("divide by zero returns 400 with a readable error", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left: 8, operator: "/", right: 0 }),
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, "Cannot divide by zero");
  });
});

test("unary square root and history clear work as a pair", async () => {
  await withServer(async (base) => {
    const rooted = await fetch(`${base}/api/unary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "sqrt", value: 9 }),
    });
    const body = await rooted.json();
    assert.equal(body.result, 3);
    assert.equal(body.historyItem.expression, "√(9)");

    const cleared = await fetch(`${base}/api/history`, { method: "DELETE" });
    const empty = await cleared.json();
    assert.equal(empty.history.length, 0);
  });
});

test("unknown operator is rejected", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left: 2, operator: "^", right: 8 }),
    });
    assert.equal(response.status, 400);
  });
});
