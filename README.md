# Interactive Calculator

A full-stack calculator you can run, read, and extend. The original files were a static HTML page that called `eval()` in the browser. This version splits the work the way a senior team would:

| Layer | Folder | Job |
| --- | --- | --- |
| Domain | `shared/` | Safe math. No HTTP. No DOM. |
| Backend | `server/` | Express API. Validates input, computes, stores history. |
| Frontend | `client/` | Vite UI. Instant typing. Asks the API for answers. |

## What "full stack" means here

**Frontend** is everything the browser shows: buttons, display, theme, keyboard. It should feel instant.

**Backend** is a small HTTP service. It is the source of truth for arithmetic and history. Refresh the page and the history is still there because the server kept it.

**Shared math** is the rulebook both sides trust. The server uses it for real answers. Tests use it so we do not depend on a running browser.

```text
You press 12 + 7 =
        │
        ▼
 client/src/main.js     reads the button
        │
        ▼
 client/src/controller.js   keeps "12" locally, then asks for 12+7
        │
        ▼
 client/src/api.js      POST /api/compute
        │
        ▼
 Vite proxy (dev only)  /api → http://127.0.0.1:3001
        │
        ▼
 server/app.js          validates JSON
        │
        ▼
 shared/math.js         12 + 7 = 19  (never eval)
        │
        ▼
 server/historyStore.js saves { expression, result }
        │
        ▼
 JSON back to the UI    display 19, append history
```

## Why we left `eval()` behind

`eval("12+7")` works until someone types something that is not math. `eval` runs JavaScript, not arithmetic. A safe engine only accepts numbers and a short operator list, then does `+ - * /` itself.

This calculator is **sequential**, like a pocket calculator: `12 + 7 × 3` is `(12 + 7) × 3 = 57`, not algebraic `33`. That is a product decision, not a bug.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm test
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

| Command | What it starts |
| --- | --- |
| `npm run dev` | Express on port 3001 and Vite on port 5173 |
| `npm run dev:server` | API only. Try `curl http://localhost:3001/api/health` |
| `npm run dev:client` | UI only. It still needs the API for `=` |
| `npm test` | Domain, API, and controller tests |
| `npm run build` then `npm start` | One production process on port 3001 |

The badge in the header is a live `GET /api/health` check. If it says **Backend offline**, the UI can still type digits, but `=` cannot compute.

## API

The frontend and any HTTP client speak the same contract.

```bash
curl -s http://localhost:3001/api/health

curl -s -X POST http://localhost:3001/api/compute \
  -H 'Content-Type: application/json' \
  -d '{"left":12,"operator":"+","right":7}'

curl -s -X POST http://localhost:3001/api/unary \
  -H 'Content-Type: application/json' \
  -d '{"operation":"sqrt","value":9}'

curl -s http://localhost:3001/api/history
curl -s -X DELETE http://localhost:3001/api/history
```

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ ok, service, time }` |
| `POST` | `/api/compute` | `{ left, operator, right }` | `{ result, formatted, history }` |
| `POST` | `/api/unary` | `{ operation, value, base? }` | same shape |
| `GET` | `/api/history` | — | `{ history }` |
| `DELETE` | `/api/history` | — | `{ history: [] }` |

`operator` is one of `+ - * /`. `operation` is one of `square`, `sqrt`, `reciprocal`, `percent`. Errors such as divide-by-zero return HTTP 400 and `{ error: "..." }`.

## Project map

```text
shared/math.js              arithmetic and formatting
shared/math.test.js         unit tests for the rulebook
server/app.js               Express routes
server/index.js             opens the port
server/historyStore.js      memory + JSON file persistence
server/app.test.js          HTTP tests against a random port
client/index.html           page structure
client/src/main.js          DOM, keyboard, theme
client/src/controller.js    local input + remote compute
client/src/api.js           fetch wrappers
client/src/style.css        layout and theme
client/vite.config.js       dev server + /api proxy
```

History is written to `data/history.json` (gitignored). Tests use an in-memory store so they do not touch disk.

## What stays in the browser on purpose

- Digit entry, decimal, backspace, ±
- Memory keys (`MC` `MR` `M+` `M−`)
- Dark / light theme (`localStorage`)

A senior default: **do not put a network round-trip on every keypress**. Send work to the server when the answer must be trusted or stored.

## Keyboard

| Key | Action |
| --- | --- |
| `0`–`9` | Digits |
| `.` or `,` | Decimal |
| `+` `-` `*` `/` | Operators |
| `Enter` or `=` | Equals (hits the API) |
| `Backspace` | Delete last digit |
| `Escape` | All clear |
| `Delete` | Clear entry |
| `%` | Percent |
| `n` | Toggle sign |

## How to keep learning

1. Read `shared/math.js`, then `server/app.js`, then `client/src/api.js`. Follow one request all the way through.
2. Add `POST /api/compute` support for a new operator (start with tests).
3. Replace `historyStore.js` with SQLite and keep the same `{ list, add, clear }` interface.
4. Add a second page that only shows history — same API, different UI.
