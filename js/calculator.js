/**
 * Sequential calculator engine.
 * Evaluates operations without eval() and keeps floating-point noise in check.
 */

const MAX_DIGITS = 12;
const PRECISION = 12;

export const ERRORS = Object.freeze({
  DIVIDE_BY_ZERO: "Cannot divide by zero",
  INVALID: "Invalid calculation",
  OVERFLOW: "Value too large",
});

export function round(value) {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Number.parseFloat(value.toPrecision(PRECISION));
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return value.toExponential(6).replace("+", "");
  }

  const rounded = round(value);
  const [whole, fraction = ""] = String(rounded).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${withCommas}.${fraction}` : withCommas;
}

function digitCount(displayValue) {
  return displayValue.replace(".", "").replace("-", "").length;
}

function compute(left, operator, right) {
  switch (operator) {
    case "+":
      return round(left + right);
    case "-":
      return round(left - right);
    case "*":
      return round(left * right);
    case "/":
      if (right === 0) {
        return Number.NaN;
      }
      return round(left / right);
    default:
      return right;
  }
}

export class Calculator {
  constructor() {
    this.memory = 0;
    this.history = [];
    this.reset();
  }

  reset() {
    this.displayValue = "0";
    this.accumulator = null;
    this.pendingOperator = null;
    this.waitingForOperand = false;
    this.lastOperand = null;
    this.lastOperator = null;
    this.error = null;
    return this.getState();
  }

  getState() {
    return {
      display: this.error ?? formatNumber(this.currentValue()),
      rawDisplay: this.displayValue,
      expression: this.buildExpression(),
      pendingOperator: this.pendingOperator,
      memory: this.memory,
      hasMemory: this.memory !== 0,
      error: this.error,
      history: [...this.history],
    };
  }

  currentValue() {
    if (this.error) {
      return Number.NaN;
    }
    const parsed = Number.parseFloat(this.displayValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  buildExpression() {
    if (this.error) {
      return "";
    }
    if (this.pendingOperator && this.accumulator !== null) {
      return `${formatNumber(this.accumulator)} ${this.symbol(this.pendingOperator)}`;
    }
    return "";
  }

  symbol(operator) {
    return { "+": "+", "-": "−", "*": "×", "/": "÷" }[operator] ?? operator;
  }

  inputDigit(digit) {
    const next = String(digit);
    if (!/^\d$/.test(next)) {
      return this.getState();
    }

    if (this.error) {
      this.reset();
    }

    if (this.waitingForOperand || this.displayValue === "0") {
      this.displayValue = next;
      this.waitingForOperand = false;
      return this.getState();
    }

    if (digitCount(this.displayValue) >= MAX_DIGITS) {
      return this.getState();
    }

    this.displayValue += next;
    return this.getState();
  }

  inputDecimal() {
    if (this.error) {
      this.reset();
    }

    if (this.waitingForOperand) {
      this.displayValue = "0.";
      this.waitingForOperand = false;
      return this.getState();
    }

    if (!this.displayValue.includes(".")) {
      this.displayValue += ".";
    }
    return this.getState();
  }

  setOperator(operator) {
    if (!["+", "-", "*", "/"].includes(operator) || this.error) {
      return this.getState();
    }

    const input = this.currentValue();

    if (this.accumulator === null) {
      this.accumulator = input;
    } else if (!this.waitingForOperand && this.pendingOperator) {
      const result = this.apply(this.accumulator, this.pendingOperator, input);
      if (this.error) {
        return this.getState();
      }
      this.accumulator = result;
      this.displayValue = String(result);
    }

    this.pendingOperator = operator;
    this.waitingForOperand = true;
    return this.getState();
  }

  equals() {
    if (this.error) {
      return this.getState();
    }

    if (this.pendingOperator && this.accumulator !== null && !this.waitingForOperand) {
      const input = this.currentValue();
      const result = this.apply(this.accumulator, this.pendingOperator, input);
      if (this.error) {
        return this.getState();
      }

      this.pushHistory(this.accumulator, this.pendingOperator, input, result);
      this.lastOperand = input;
      this.lastOperator = this.pendingOperator;
      this.displayValue = String(result);
      this.accumulator = result;
      this.pendingOperator = null;
      this.waitingForOperand = true;
      return this.getState();
    }

    if (this.lastOperator !== null && this.lastOperand !== null) {
      const left = this.currentValue();
      const result = this.apply(left, this.lastOperator, this.lastOperand);
      if (this.error) {
        return this.getState();
      }
      this.pushHistory(left, this.lastOperator, this.lastOperand, result);
      this.displayValue = String(result);
      this.accumulator = result;
      this.waitingForOperand = true;
    }

    return this.getState();
  }

  apply(left, operator, right) {
    const result = compute(left, operator, right);
    if (Number.isNaN(result)) {
      this.error = ERRORS.DIVIDE_BY_ZERO;
      return Number.NaN;
    }
    if (!Number.isFinite(result) || Math.abs(result) >= 1e16) {
      this.error = ERRORS.OVERFLOW;
      return Number.NaN;
    }
    return result;
  }

  pushHistory(left, operator, right, result) {
    this.history.unshift({
      expression: `${formatNumber(left)} ${this.symbol(operator)} ${formatNumber(right)}`,
      result: formatNumber(result),
    });
    this.history = this.history.slice(0, 20);
  }

  clearEntry() {
    if (this.error) {
      return this.reset();
    }
    this.displayValue = "0";
    this.waitingForOperand = false;
    return this.getState();
  }

  backspace() {
    if (this.error) {
      return this.reset();
    }
    if (this.waitingForOperand) {
      return this.getState();
    }
    if (this.displayValue.length <= 1 || (this.displayValue.length === 2 && this.displayValue.startsWith("-"))) {
      this.displayValue = "0";
      return this.getState();
    }
    this.displayValue = this.displayValue.slice(0, -1);
    return this.getState();
  }

  toggleSign() {
    if (this.error) {
      return this.getState();
    }
    if (this.displayValue === "0") {
      return this.getState();
    }
    this.displayValue = this.displayValue.startsWith("-")
      ? this.displayValue.slice(1)
      : `-${this.displayValue}`;
    return this.getState();
  }

  percent() {
    if (this.error) {
      return this.getState();
    }

    const current = this.currentValue();
    let next;

    if (this.accumulator !== null && this.pendingOperator && ["+", "-"].includes(this.pendingOperator)) {
      next = round((this.accumulator * current) / 100);
    } else {
      next = round(current / 100);
    }

    this.displayValue = String(next);
    this.waitingForOperand = false;
    return this.getState();
  }

  square() {
    return this.unary((value) => round(value * value), "sqr");
  }

  squareRoot() {
    return this.unary((value) => {
      if (value < 0) {
        this.error = ERRORS.INVALID;
        return Number.NaN;
      }
      return round(Math.sqrt(value));
    }, "√");
  }

  reciprocal() {
    return this.unary((value) => {
      if (value === 0) {
        this.error = ERRORS.DIVIDE_BY_ZERO;
        return Number.NaN;
      }
      return round(1 / value);
    }, "1/");
  }

  unary(fn, label) {
    if (this.error) {
      return this.getState();
    }
    const current = this.currentValue();
    const result = fn(current);
    if (this.error) {
      return this.getState();
    }
    this.pushHistoryLabel(label, current, result);
    this.displayValue = String(result);
    this.waitingForOperand = true;
    return this.getState();
  }

  pushHistoryLabel(label, value, result) {
    this.history.unshift({
      expression: `${label}(${formatNumber(value)})`,
      result: formatNumber(result),
    });
    this.history = this.history.slice(0, 20);
  }

  memoryClear() {
    this.memory = 0;
    return this.getState();
  }

  memoryRecall() {
    if (this.error) {
      this.reset();
    }
    this.displayValue = String(this.memory);
    this.waitingForOperand = false;
    return this.getState();
  }

  memoryAdd() {
    if (this.error) {
      return this.getState();
    }
    this.memory = round(this.memory + this.currentValue());
    this.waitingForOperand = true;
    return this.getState();
  }

  memorySubtract() {
    if (this.error) {
      return this.getState();
    }
    this.memory = round(this.memory - this.currentValue());
    this.waitingForOperand = true;
    return this.getState();
  }

  clearHistory() {
    this.history = [];
    return this.getState();
  }

  useHistoryResult(resultText) {
    const normalized = String(resultText).replace(/,/g, "");
    const value = Number.parseFloat(normalized);
    if (!Number.isFinite(value)) {
      return this.getState();
    }
    if (this.error) {
      this.reset();
    }
    this.displayValue = String(value);
    this.waitingForOperand = false;
    return this.getState();
  }
}
