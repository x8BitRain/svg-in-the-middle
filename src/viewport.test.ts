import { expect, test } from "bun:test";
import { parseViewport } from "./viewport.ts";

test("parses a valid viewport", () => {
  const params = new URLSearchParams({ width: "390", height: "844", dpr: "3" });
  expect(parseViewport(params)).toEqual({ width: 390, height: 844, pixelRatio: 3 });
});

test("rejects a fractional size", () => {
  const params = new URLSearchParams({ width: "390.5", height: "844", dpr: "3" });
  expect(parseViewport(params)).toBeNull();
});

test("rejects a missing pixel ratio", () => {
  const params = new URLSearchParams({ width: "390", height: "844" });
  expect(parseViewport(params)).toBeNull();
});
