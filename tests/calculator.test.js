import { test } from "node:test";
import assert from "node:assert/strict";
import { Calculator, ERRORS, formatNumber, round } from "../js/calculator.js";

function press(calc, sequence) {
  for (const token of sequence) {
    if (token === ".") {
      calc.inputDecimal();
    } else if (token === "=") {
      calc.equals();
    } else if (["+", "-", "*", "/"].includes(token)) {
      calc.setOperator(token);
    } else if (/^\d$/.test(token)) {
      calc.inputDigit(token);
    } else {
      throw new Error(`Unknown token: ${token}`);
    }
  }
  return calc.getState();
}

test("adds and multiplies with chained operators", () => {
  const calc = new Calculator();
  press(calc, ["1", "2", "+", "7", "*", "3", "="]);
  assert.equal(calc.getState().display, "57");
});

test("handles decimals and floating-point noise", () => {
  const calc = new Calculator();
  press(calc, ["0", ".", "1", "+", "0", ".", "2", "="]);
  assert.equal(calc.getState().display, "0.3");
  assert.equal(round(0.1 + 0.2), 0.3);
});

test("rejects divide by zero", () => {
  const calc = new Calculator();
  press(calc, ["8", "/", "0", "="]);
  assert.equal(calc.getState().error, ERRORS.DIVIDE_BY_ZERO);
  assert.equal(calc.getState().display, ERRORS.DIVIDE_BY_ZERO);
});

test("repeats the last operation when equals is pressed again", () => {
  const calc = new Calculator();
  press(calc, ["5", "+", "2", "=", "="]);
  assert.equal(calc.getState().display, "9");
});

test("percent uses the pending addend as a percentage of the accumulator", () => {
  const calc = new Calculator();
  press(calc, ["2", "0", "0", "+", "1", "0"]);
  calc.percent();
  calc.equals();
  assert.equal(calc.getState().display, "220");
});

test("percent alone divides by 100", () => {
  const calc = new Calculator();
  press(calc, ["5", "0"]);
  calc.percent();
  assert.equal(calc.getState().display, "0.5");
});

test("toggle sign and backspace edit the current entry", () => {
  const calc = new Calculator();
  press(calc, ["1", "2", "3"]);
  calc.toggleSign();
  assert.equal(calc.getState().rawDisplay, "-123");
  calc.backspace();
  assert.equal(calc.getState().rawDisplay, "-12");
});

test("memory add and recall persist a value", () => {
  const calc = new Calculator();
  press(calc, ["1", "5"]);
  calc.memoryAdd();
  calc.reset();
  calc.memoryRecall();
  assert.equal(calc.getState().display, "15");
  assert.equal(calc.getState().hasMemory, true);
});

test("unary operations record history", () => {
  const calc = new Calculator();
  press(calc, ["9"]);
  calc.squareRoot();
  const state = calc.getState();
  assert.equal(state.display, "3");
  assert.equal(state.history[0].expression, "√(9)");
});

test("square root of a negative number is invalid", () => {
  const calc = new Calculator();
  press(calc, ["9"]);
  calc.toggleSign();
  calc.squareRoot();
  assert.equal(calc.getState().error, ERRORS.INVALID);
});

test("formatNumber groups thousands", () => {
  assert.equal(formatNumber(1234567), "1,234,567");
});

test("history result can be reused", () => {
  const calc = new Calculator();
  press(calc, ["8", "+", "2", "="]);
  calc.useHistoryResult("10");
  calc.setOperator("*");
  press(calc, ["4", "="]);
  assert.equal(calc.getState().display, "40");
});
