import { api } from "./api.js";
import { createController } from "./controller.js";

const THEME_KEY = "interactive-calculator:theme";

const controller = createController(api);

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
const statusEl = document.querySelector("[data-status]");

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  const next = theme === "light" ? "dark" : "light";
  themeToggleEl.setAttribute("aria-label", `Switch to ${next} theme`);
  themeToggleEl.dataset.theme = theme;
}

function render(state) {
  displayEl.textContent = state.display;
  expressionEl.textContent = state.expression || "\u00a0";
  displayEl.classList.toggle("is-error", Boolean(state.error));
  memoryFlagEl.hidden = !state.hasMemory;
  keypadEl.classList.toggle("is-busy", state.busy);

  const fontSize =
    state.display.length > 12 ? "1.7rem" : state.display.length > 9 ? "2.1rem" : "2.6rem";
  displayEl.style.fontSize = fontSize;

  statusEl.dataset.online = String(state.online);
  statusEl.textContent = state.online ? "Backend online" : "Backend offline";

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
        render(controller.useHistoryResult(item.result));
      });
      historyListEl.append(button);
    }
  }
}

async function run(action) {
  const result = action();
  render(result instanceof Promise ? await result : result);
}

function handleAction(action, value) {
  switch (action) {
    case "digit":
      return run(() => controller.inputDigit(value));
    case "decimal":
      return run(() => controller.inputDecimal());
    case "operator":
      return run(() => controller.setOperator(value));
    case "equals":
      return run(() => controller.equals());
    case "clear":
      return run(() => controller.reset());
    case "clear-entry":
      return run(() => controller.clearEntry());
    case "backspace":
      return run(() => controller.backspace());
    case "sign":
      return run(() => controller.toggleSign());
    case "percent":
      return run(() => controller.unary("percent"));
    case "square":
      return run(() => controller.unary("square"));
    case "sqrt":
      return run(() => controller.unary("sqrt"));
    case "reciprocal":
      return run(() => controller.unary("reciprocal"));
    case "memory-clear":
      return run(() => controller.memoryClear());
    case "memory-recall":
      return run(() => controller.memoryRecall());
    case "memory-add":
      return run(() => controller.memoryAdd());
    case "memory-subtract":
      return run(() => controller.memorySubtract());
    default:
      return undefined;
  }
}

keypadEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }
  handleAction(button.dataset.action, button.dataset.value);
});

themeToggleEl.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  updateThemeButton(next);
});

historyToggleEl.addEventListener("click", () => {
  const open = historyPanelEl.classList.toggle("is-open");
  historyToggleEl.setAttribute("aria-expanded", String(open));
});

historyClearEl.addEventListener("click", () => {
  run(() => controller.clearHistory());
});

const keyMap = {
  Enter: () => handleAction("equals"),
  "=": () => handleAction("equals"),
  Escape: () => handleAction("clear"),
  Delete: () => handleAction("clear-entry"),
  Backspace: () => handleAction("backspace"),
  "%": () => handleAction("percent"),
  ".": () => handleAction("decimal"),
  ",": () => handleAction("decimal"),
  n: () => handleAction("sign"),
  N: () => handleAction("sign"),
};

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    handleAction("digit", event.key);
    return;
  }

  if (["+", "-", "*", "/"].includes(event.key)) {
    event.preventDefault();
    handleAction("operator", event.key);
    return;
  }

  const mapped = keyMap[event.key];
  if (mapped) {
    event.preventDefault();
    mapped();
  }
});

loadTheme();
render(controller.getState());

await controller.checkHealth();
render(await controller.loadHistory());
