import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBinary,
  computeUnary,
  describeBinary,
  describeUnary,
  formatNumber,
} from "../../shared/math.js";
import { createController } from "./controller.js";

/**
 * A fake backend. Same contract as client/src/api.js, but it calls
 * shared/math.js in-process. Controller tests stay fast and do not
 * need a listening HTTP server.
 */
function createLocalApi() {
  let history = [];

  function record(expression, value) {
    const item = { expression, result: formatNumber(value) };
    history = [item, ...history].slice(0, 20);
    return { result: value, formatted: item.result, history };
  }

  return {
    async health() {
      return { ok: true };
    },
    async history() {
      return { history };
    },
    async clearHistory() {
      history = [];
      return { history };
    },
    async compute(left, operator, right) {
      const outcome = computeBinary(left, operator, right);
      if (!outcome.ok) {
        throw new Error(outcome.error);
      }
      return record(describeBinary(left, operator, right), outcome.value);
    },
    async unary(operation, value, base) {
      const outcome = computeUnary(operation, value, base);
      if (!outcome.ok) {
        throw new Error(outcome.error);
      }
      return record(describeUnary(operation, value), outcome.value);
    },
  };
}

async function press(controller, sequence) {
  for (const token of sequence) {
    if (token === ".") {
      controller.inputDecimal();
    } else if (token === "=") {
      await controller.equals();
    } else if (["+", "-", "*", "/"].includes(token)) {
      await controller.setOperator(token);
    } else if (/^\d$/.test(token)) {
      controller.inputDigit(token);
    } else {
      throw new Error(`Unknown token: ${token}`);
    }
  }
  return controller.getState();
}

test("adds and multiplies with chained operators through the API contract", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["1", "2", "+", "7", "*", "3", "="]);
  assert.equal(controller.getState().display, "57");
});

test("handles decimals", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["0", ".", "1", "+", "0", ".", "2", "="]);
  assert.equal(controller.getState().display, "0.3");
});

test("surfaces divide-by-zero from the API as display error", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["8", "/", "0", "="]);
  assert.equal(controller.getState().error, "Cannot divide by zero");
});

test("repeats the last operation when equals is pressed again", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["5", "+", "2", "=", "="]);
  assert.equal(controller.getState().display, "9");
});

test("percent uses the pending addend as a percentage of the accumulator", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["2", "0", "0", "+", "1", "0"]);
  await controller.unary("percent");
  await controller.equals();
  assert.equal(controller.getState().display, "220");
});

test("toggle sign and backspace edit the current entry locally", () => {
  const controller = createController(createLocalApi());
  controller.inputDigit("1");
  controller.inputDigit("2");
  controller.inputDigit("3");
  controller.toggleSign();
  assert.equal(controller.getState().rawDisplay, "-123");
  controller.backspace();
  assert.equal(controller.getState().rawDisplay, "-12");
});

test("memory add and recall persist a value on the client", () => {
  const controller = createController(createLocalApi());
  controller.inputDigit("1");
  controller.inputDigit("5");
  controller.memoryAdd();
  controller.reset();
  controller.memoryRecall();
  assert.equal(controller.getState().display, "15");
  assert.equal(controller.getState().hasMemory, true);
});

test("unary operations record history from the API", async () => {
  const controller = createController(createLocalApi());
  controller.inputDigit("9");
  await controller.unary("sqrt");
  const state = controller.getState();
  assert.equal(state.display, "3");
  assert.equal(state.history[0].expression, "√(9)");
});

test("history result can be reused in the next calculation", async () => {
  const controller = createController(createLocalApi());
  await press(controller, ["8", "+", "2", "="]);
  controller.useHistoryResult("10");
  await controller.setOperator("*");
  await press(controller, ["4", "="]);
  assert.equal(controller.getState().display, "40");
});
