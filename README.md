# Interactive Calculator

A complete web calculator with a sequential engine, calculation history, memory keys, keyboard support, and a dark/light theme. The original tutorial files used `eval()`, a misspelled HTML filename, and incomplete error handling. This version replaces them with a real, usable project.

## Features

- Addition, subtraction, multiplication, and division
- Decimal input, sign toggle, percent, square, square root, and reciprocal
- All clear, backspace, and repeating equals
- Memory keys: `MC`, `MR`, `M+`, `M−`
- Persistent history and theme via `localStorage`
- Full keyboard support
- Safe evaluation with no `eval()`
- Divide-by-zero and invalid-operation messages

## Project structure

```
index.html          # App shell
css/styles.css      # Theme and layout
js/calculator.js    # Calculator engine
js/app.js           # UI, keyboard, and persistence
tests/              # Node test runner coverage
assets/favicon.svg  # App icon
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

## Tests

```bash
npm test
```

The suite uses Node's built-in test runner. No extra dependencies are required.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `0`–`9` | Digits |
| `.` or `,` | Decimal |
| `+` `-` `*` `/` | Operators |
| `Enter` or `=` | Equals |
| `Backspace` | Delete last digit |
| `Escape` | All clear |
| `Delete` | Clear entry |
| `%` | Percent |
| `n` | Toggle sign |
