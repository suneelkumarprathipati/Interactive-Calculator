/**
 * UI controller — local input state + remote math.
 *
 * Digits, decimals, backspace, and memory stay in the browser so
 * typing feels instant. The moment we need a real calculation, we
 * call the API. That split is how you keep a UI snappy without
 * duplicating business rules.
 */

import { formatNumber } from "../../shared/math.js";

const MAX_DIGITS = 12;

function digitCount(displayValue) {
  return displayValue.replace(".", "").replace("-", "").length;
}

export function createController(api) {
  const state = {
    displayValue: "0",
    accumulator: null,
    pendingOperator: null,
    waitingForOperand: false,
    lastOperand: null,
    lastOperator: null,
    memory: 0,
    error: null,
    history: [],
    busy: false,
    online: false,
  };

  function currentValue() {
    const parsed = Number.parseFloat(state.displayValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function snapshot() {
    return {
      display: state.error ?? formatNumber(currentValue()),
      rawDisplay: state.displayValue,
      expression: buildExpression(),
      pendingOperator: state.pendingOperator,
      memory: state.memory,
      hasMemory: state.memory !== 0,
      error: state.error,
      history: [...state.history],
      busy: state.busy,
      online: state.online,
    };
  }

  function buildExpression() {
    if (state.error || state.accumulator === null || !state.pendingOperator) {
      return "";
    }
    const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
    return `${formatNumber(state.accumulator)} ${symbols[state.pendingOperator]}`;
  }

  function resetEntry() {
    state.displayValue = "0";
    state.accumulator = null;
    state.pendingOperator = null;
    state.waitingForOperand = false;
    state.lastOperand = null;
    state.lastOperator = null;
    state.error = null;
    return snapshot();
  }

  async function applyRemote(fn) {
    if (state.busy) {
      return snapshot();
    }
    state.busy = true;
    try {
      await fn();
      state.online = true;
      state.error = null;
    } catch (error) {
      state.error = error.message;
      if (error.message.startsWith("Cannot reach")) {
        state.online = false;
      }
    } finally {
      // Snapshot after this flag clears. Returning a mid-request
      // snapshot would leave the keypad stuck with pointer-events: none.
      state.busy = false;
    }
    return snapshot();
  }

  function inputDigit(digit) {
    const next = String(digit);
    if (!/^\d$/.test(next)) {
      return snapshot();
    }
    if (state.error) {
      resetEntry();
    }
    if (state.waitingForOperand || state.displayValue === "0") {
      state.displayValue = next;
      state.waitingForOperand = false;
      return snapshot();
    }
    if (digitCount(state.displayValue) >= MAX_DIGITS) {
      return snapshot();
    }
    state.displayValue += next;
    return snapshot();
  }

  function inputDecimal() {
    if (state.error) {
      resetEntry();
    }
    if (state.waitingForOperand) {
      state.displayValue = "0.";
      state.waitingForOperand = false;
      return snapshot();
    }
    if (!state.displayValue.includes(".")) {
      state.displayValue += ".";
    }
    return snapshot();
  }

  async function setOperator(operator) {
    if (!["+", "-", "*", "/"].includes(operator) || state.error) {
      return snapshot();
    }

    const input = currentValue();

    if (state.accumulator === null) {
      state.accumulator = input;
    } else if (!state.waitingForOperand && state.pendingOperator) {
      const applied = await applyRemote(async () => {
        const body = await api.compute(state.accumulator, state.pendingOperator, input);
        state.accumulator = body.result;
        state.displayValue = String(body.result);
        state.history = body.history;
      });
      if (state.error) {
        return applied;
      }
    }

    state.pendingOperator = operator;
    state.waitingForOperand = true;
    return snapshot();
  }

  async function equals() {
    if (state.error) {
      return snapshot();
    }

    if (state.pendingOperator && state.accumulator !== null && !state.waitingForOperand) {
      const input = currentValue();
      return applyRemote(async () => {
        const body = await api.compute(state.accumulator, state.pendingOperator, input);
        state.lastOperand = input;
        state.lastOperator = state.pendingOperator;
        state.displayValue = String(body.result);
        state.accumulator = body.result;
        state.pendingOperator = null;
        state.waitingForOperand = true;
        state.history = body.history;
      });
    }

    if (state.lastOperator !== null && state.lastOperand !== null) {
      const left = currentValue();
      return applyRemote(async () => {
        const body = await api.compute(left, state.lastOperator, state.lastOperand);
        state.displayValue = String(body.result);
        state.accumulator = body.result;
        state.waitingForOperand = true;
        state.history = body.history;
      });
    }

    return snapshot();
  }

  async function unary(operation) {
    if (state.error) {
      return snapshot();
    }

    const value = currentValue();
    const base =
      operation === "percent" &&
      state.accumulator !== null &&
      ["+", "-"].includes(state.pendingOperator)
        ? state.accumulator
        : undefined;

    return applyRemote(async () => {
      const body = await api.unary(operation, value, base);
      state.displayValue = String(body.result);
      // Percent replaces the current operand so 200 + 10% = still waits for =.
      // Square / sqrt / 1/x are complete answers, so the next key starts fresh.
      state.waitingForOperand = operation !== "percent";
      state.history = body.history;
    });
  }

  function clearEntry() {
    if (state.error) {
      return resetEntry();
    }
    state.displayValue = "0";
    state.waitingForOperand = false;
    return snapshot();
  }

  function backspace() {
    if (state.error) {
      return resetEntry();
    }
    if (state.waitingForOperand) {
      return snapshot();
    }
    if (
      state.displayValue.length <= 1 ||
      (state.displayValue.length === 2 && state.displayValue.startsWith("-"))
    ) {
      state.displayValue = "0";
      return snapshot();
    }
    state.displayValue = state.displayValue.slice(0, -1);
    return snapshot();
  }

  function toggleSign() {
    if (state.error || state.displayValue === "0") {
      return snapshot();
    }
    state.displayValue = state.displayValue.startsWith("-")
      ? state.displayValue.slice(1)
      : `-${state.displayValue}`;
    return snapshot();
  }

  function memoryClear() {
    state.memory = 0;
    return snapshot();
  }

  function memoryRecall() {
    if (state.error) {
      resetEntry();
    }
    state.displayValue = String(state.memory);
    state.waitingForOperand = false;
    return snapshot();
  }

  function memoryAdd() {
    if (state.error) {
      return snapshot();
    }
    state.memory = Number.parseFloat((state.memory + currentValue()).toPrecision(12));
    state.waitingForOperand = true;
    return snapshot();
  }

  function memorySubtract() {
    if (state.error) {
      return snapshot();
    }
    state.memory = Number.parseFloat((state.memory - currentValue()).toPrecision(12));
    state.waitingForOperand = true;
    return snapshot();
  }

  async function loadHistory() {
    return applyRemote(async () => {
      const body = await api.history();
      state.history = body.history;
    });
  }

  async function clearHistory() {
    return applyRemote(async () => {
      const body = await api.clearHistory();
      state.history = body.history;
    });
  }

  function useHistoryResult(resultText) {
    const normalized = String(resultText).replace(/,/g, "");
    const value = Number.parseFloat(normalized);
    if (!Number.isFinite(value)) {
      return snapshot();
    }
    if (state.error) {
      resetEntry();
    }
    state.displayValue = String(value);
    state.waitingForOperand = false;
    return snapshot();
  }

  async function checkHealth() {
    try {
      await api.health();
      state.online = true;
      state.error = null;
    } catch {
      state.online = false;
    }
    return snapshot();
  }

  return {
    getState: snapshot,
    reset: resetEntry,
    inputDigit,
    inputDecimal,
    setOperator,
    equals,
    unary,
    clearEntry,
    backspace,
    toggleSign,
    memoryClear,
    memoryRecall,
    memoryAdd,
    memorySubtract,
    loadHistory,
    clearHistory,
    useHistoryResult,
    checkHealth,
  };
}
