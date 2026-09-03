import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ERRORS,
  computeBinary,
  computeUnary,
  formatNumber,
  round,
  describeBinary,
} from "./math.js";

test("adds and multiplies as sequential calculator steps", () => {
  const sum = computeBinary(12, "+", 7);
  assert.equal(sum.ok, true);
  const product = computeBinary(sum.value, "*", 3);
  assert.equal(product.ok, true);
  assert.equal(product.value, 57);
});

test("rounds floating-point noise so 0.1 + 0.2 is 0.3", () => {
  const result = computeBinary(0.1, "+", 0.2);
  assert.equal(result.ok, true);
  assert.equal(result.value, 0.3);
  assert.equal(round(0.1 + 0.2), 0.3);
});

test("rejects divide by zero instead of returning Infinity", () => {
  const result = computeBinary(8, "/", 0);
  assert.equal(result.ok, false);
  assert.equal(result.error, ERRORS.DIVIDE_BY_ZERO);
});

test("percent of an accumulator is used for + and -", () => {
  const tenPercentOf200 = computeUnary("percent", 10, 200);
  assert.equal(tenPercentOf200.ok, true);
  assert.equal(tenPercentOf200.value, 20);
});

test("percent alone divides by 100", () => {
  const result = computeUnary("percent", 50);
  assert.equal(result.ok, true);
  assert.equal(result.value, 0.5);
});

test("square root of a negative number is invalid", () => {
  const result = computeUnary("sqrt", -9);
  assert.equal(result.ok, false);
  assert.equal(result.error, ERRORS.INVALID);
});

test("reciprocal of zero is divide by zero", () => {
  const result = computeUnary("reciprocal", 0);
  assert.equal(result.ok, false);
  assert.equal(result.error, ERRORS.DIVIDE_BY_ZERO);
});

test("formatNumber groups thousands", () => {
  assert.equal(formatNumber(1234567), "1,234,567");
});

test("describeBinary uses readable operator symbols", () => {
  assert.equal(describeBinary(8, "*", 2), "8 × 2");
});

test("rejects unknown operators and non-numbers", () => {
  assert.equal(computeBinary(1, "^", 2).error, ERRORS.INVALID);
  assert.equal(computeBinary("nope", "+", 1).error, ERRORS.BAD_INPUT);
});
