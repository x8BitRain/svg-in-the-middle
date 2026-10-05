import { describe, expect, test } from "bun:test";
import { toProxyPath, toTargetUrl } from "./target-url.ts";

describe("toTargetUrl", () => {
  test("defaults to https", () => {
    expect(toTargetUrl("/x.com/trending")?.href).toBe("https://x.com/trending");
  });

  test("keeps the query string", () => {
    expect(toTargetUrl("/example.com/search?q=a+b")?.href).toBe("https://example.com/search?q=a+b");
  });

  test("keeps an explicit http protocol", () => {
    expect(toTargetUrl("/http://example.com/")?.href).toBe("http://example.com/");
  });

  test("rejects a host without a dot", () => {
    expect(toTargetUrl("/settings")).toBeNull();
  });
});

describe("toProxyPath", () => {
  test("drops the default https protocol", () => {
    expect(toProxyPath("https://x.com/trending?q=1")).toBe("/x.com/trending?q=1");
  });

  test("keeps an explicit http protocol", () => {
    expect(toProxyPath("http://example.com/")).toBe("/http://example.com/");
  });
});
