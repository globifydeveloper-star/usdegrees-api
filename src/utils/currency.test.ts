import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCurrencyString } from "./currency";

test("parses broken comma grouping by digit sequence, not comma position", () => {
  assert.equal(parseCurrencyString("$45,50,865"), 4550865);
});

test("parses normally-grouped currency the same way (digits only)", () => {
  assert.equal(parseCurrencyString("$4,550,865"), 4550865);
});

test("parses a value with no separators", () => {
  assert.equal(parseCurrencyString("116367"), 116367);
});

test("parses a bare dollar-prefixed value", () => {
  assert.equal(parseCurrencyString("$9,138"), 9138);
});

test("treats '-' as null, not zero", () => {
  assert.equal(parseCurrencyString("-"), null);
});

test("treats empty string as null", () => {
  assert.equal(parseCurrencyString(""), null);
});

test("treats null and undefined as null", () => {
  assert.equal(parseCurrencyString(null), null);
  assert.equal(parseCurrencyString(undefined), null);
});

test("passes through a finite number unchanged", () => {
  assert.equal(parseCurrencyString(13021239), 13021239);
});

test("returns null for a non-finite number", () => {
  assert.equal(parseCurrencyString(NaN), null);
});
