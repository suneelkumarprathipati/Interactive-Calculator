import { Calculator } from "./calculator.js";

const STORAGE_KEYS = {
  theme: "interactive-calculator:theme",
  history: "interactive-calculator:history",
};

const calculator = new Calculator();

const displayEl = document.querySelector("[data-display]");
const expressionEl = document.querySelector("[data-expression]");
const memoryFlagEl = document.querySelector("[data-memory-flag]");
const historyListEl = document.querySelector("[data-history-list]");
const historyEmptyEl = document.querySelector("[data-history-empty]");
const keypadEl = document.querySelector("[data-keypad]");
const themeToggleEl = document.querySelector("[data-theme-toggle]");
const historyToggleEl = document.querySelector("[data-history-toggle]");
const historyClearEl = document.querySelector("[data-history-clear]");
const historyPanelEl = document.querySelector("[data-history-panel]");

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  const theme = saved === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  if (!themeToggleEl) {
    return;
  }
  const next = theme === "light" ? "dark" : "light";
  themeToggleEl.setAttribute("aria-label", `Switch to ${next} theme`);
  themeToggleEl.dataset.theme = theme;
}

function persistTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      calculator.history = parsed.slice(0, 20);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.history);
  }
}

function persistHistory(history) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

function render(state) {
  displayEl.textContent = state.display;
  expressionEl.textContent = state.expression || "\u00a0";
  displayEl.classList.toggle("is-error", Boolean(state.error));
  memoryFlagEl.hidden = !state.hasMemory;

  const fontSize = state.display.length > 12 ? "1.7rem" : state.display.length > 9 ? "2.1rem" : "2.6rem";
  displayEl.style.fontSize = fontSize;

  historyListEl.replaceChildren();
  if (state.history.length === 0) {
    historyEmptyEl.hidden = false;
  } else {
    historyEmptyEl.hidden = true;
    for (const item of state.history) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.innerHTML = `<span class="history-item__expr">${item.expression}</span><span class="history-item__result">${item.result}</span>`;
      button.addEventListener("click", () => {
        render(calculator.useHistoryResult(item.result));
      });
      historyListEl.append(button);
    }
  }

  persistHistory(state.history);
}

function handleAction(action, value) {
  switch (action) {
    case "digit":
      return calculator.inputDigit(value);
    case "decimal":
      return calculator.inputDecimal();
    case "operator":
      return calculator.setOperator(value);
    case "equals":
      return calculator.equals();
    case "clear":
      return calculator.reset();
    case "clear-entry":
      return calculator.clearEntry();
    case "backspace":
      return calculator.backspace();
    case "sign":
      return calculator.toggleSign();
    case "percent":
      return calculator.percent();
    case "square":
      return calculator.square();
    case "sqrt":
      return calculator.squareRoot();
    case "reciprocal":
      return calculator.reciprocal();
    case "memory-clear":
      return calculator.memoryClear();
    case "memory-recall":
      return calculator.memoryRecall();
    case "memory-add":
      return calculator.memoryAdd();
    case "memory-subtract":
      return calculator.memorySubtract();
    default:
      return calculator.getState();
  }
}

keypadEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }
  render(handleAction(button.dataset.action, button.dataset.value));
});

historyClearEl.addEventListener("click", () => {
  render(calculator.clearHistory());
});

themeToggleEl.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  persistTheme(next);
  updateThemeButton(next);
});

historyToggleEl.addEventListener("click", () => {
  const open = historyPanelEl.classList.toggle("is-open");
  historyToggleEl.setAttribute("aria-expanded", String(open));
});

const KEY_MAP = {
  Enter: { action: "equals" },
  "=": { action: "equals" },
  Escape: { action: "clear" },
  Backspace: { action: "backspace" },
  Delete: { action: "clear-entry" },
  "%": { action: "percent" },
  ".": { action: "decimal" },
  ",": { action: "decimal" },
  "+": { action: "operator", value: "+" },
  "-": { action: "operator", value: "-" },
  "*": { action: "operator", value: "*" },
  "/": { action: "operator", value: "/" },
  n: { action: "sign" },
};

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    render(calculator.inputDigit(event.key));
    flashKey(`[data-action="digit"][data-value="${event.key}"]`);
    return;
  }

  const mapped = KEY_MAP[event.key];
  if (!mapped) {
    return;
  }

  event.preventDefault();
  render(handleAction(mapped.action, mapped.value));
  const selector = mapped.value
    ? `[data-action="${mapped.action}"][data-value="${mapped.value}"]`
    : `[data-action="${mapped.action}"]`;
  flashKey(selector);
});

function flashKey(selector) {
  const key = keypadEl.querySelector(selector);
  if (!key) {
    return;
  }
  key.classList.add("is-pressed");
  window.setTimeout(() => key.classList.remove("is-pressed"), 120);
}

loadTheme();
loadHistory();
render(calculator.getState());
