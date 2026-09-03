/**
 * API client — the only file that knows how to talk HTTP.
 *
 * The rest of the UI calls these functions. If the backend URL
 * or payload shape changes, you edit this file, not the keypad.
 */

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the calculator server. Is `npm run dev` running?");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

export const api = {
  health() {
    return request("/api/health");
  },
  history() {
    return request("/api/history");
  },
  clearHistory() {
    return request("/api/history", { method: "DELETE" });
  },
  compute(left, operator, right) {
    return request("/api/compute", {
      method: "POST",
      body: JSON.stringify({ left, operator, right }),
    });
  },
  unary(operation, value, base) {
    return request("/api/unary", {
      method: "POST",
      body: JSON.stringify({ operation, value, base }),
    });
  },
};
