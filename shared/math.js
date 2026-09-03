/**
 * Shared math engine — the domain layer.
 *
 * This file has no HTTP, no DOM, and no Node-only APIs.
 * The backend imports it to compute answers. Tests import it
 * to prove the rules. That is the point: business logic lives
 * in one place, not inside button click handlers.
 *
 * We never use eval(). eval() runs arbitrary JavaScript, so a
 * crafted expression can steal data or crash the page.
 */

export const ERRORS = Object.freeze({
  DIVIDE_BY_ZERO: "Cannot divide by zero",
  INVALID: "Invalid calculation",
  OVERFLOW: "Value too large",
  BAD_INPUT: "Enter a valid number",
});

export const BINARY_OPERATORS = Object.freeze(["+", "-", "*", "/"]);
export const UNARY_OPERATIONS = Object.freeze(["square", "sqrt", "reciprocal", "percent"]);

const PRECISION = 12;
const OVERFLOW_LIMIT = 1e16;

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

export function symbol(operator) {
  return { "+": "+", "-": "−", "*": "×", "/": "÷" }[operator] ?? operator;
}

function fail(error) {
  return { ok: false, error };
}

function ok(value) {
  if (!Number.isFinite(value) || Math.abs(value) >= OVERFLOW_LIMIT) {
    return fail(ERRORS.OVERFLOW);
  }
  return { ok: true, value: round(value) };
}

function requireNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Sequential binary math. 12 + 7 × 3 is (12 + 7) × 3 = 57.
 * A pocket calculator works this way. A programming language
 * would apply operator precedence and give 33. Both are valid;
 * we choose sequential because that is how this UI feels.
 */
export function computeBinary(left, operator, right) {
  const a = requireNumber(left);
  const b = requireNumber(right);

  if (a === null || b === null) {
    return fail(ERRORS.BAD_INPUT);
  }
  if (!BINARY_OPERATORS.includes(operator)) {
    return fail(ERRORS.INVALID);
  }

  switch (operator) {
    case "+":
      return ok(a + b);
    case "-":
      return ok(a - b);
    case "*":
      return ok(a * b);
    case "/":
      if (b === 0) {
        return fail(ERRORS.DIVIDE_BY_ZERO);
      }
      return ok(a / b);
    default:
      return fail(ERRORS.INVALID);
  }
}

export function computeUnary(operation, value, base) {
  const current = requireNumber(value);
  if (current === null) {
    return fail(ERRORS.BAD_INPUT);
  }
  if (!UNARY_OPERATIONS.includes(operation)) {
    return fail(ERRORS.INVALID);
  }

  switch (operation) {
    case "square":
      return ok(current * current);
    case "sqrt":
      if (current < 0) {
        return fail(ERRORS.INVALID);
      }
      return ok(Math.sqrt(current));
    case "reciprocal":
      if (current === 0) {
        return fail(ERRORS.DIVIDE_BY_ZERO);
      }
      return ok(1 / current);
    case "percent": {
      const relativeTo = requireNumber(base);
      if (relativeTo !== null) {
        return ok((relativeTo * current) / 100);
      }
      return ok(current / 100);
    }
    default:
      return fail(ERRORS.INVALID);
  }
}

export function describeBinary(left, operator, right) {
  return `${formatNumber(left)} ${symbol(operator)} ${formatNumber(right)}`;
}

export function describeUnary(operation, value) {
  const labels = {
    square: "sqr",
    sqrt: "√",
    reciprocal: "1/",
    percent: "%",
  };
  return `${labels[operation] ?? operation}(${formatNumber(value)})`;
}
