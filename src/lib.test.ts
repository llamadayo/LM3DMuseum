import { describe, expect, it } from "vitest";
import { assetUrl, parseRoute, exhibitHref } from "./lib";

describe("portable Pages URLs", () => {
  it("resolves project subdirectories without dropping the repository prefix", () => {
    expect(assetUrl("models/item.glb", "/LM3DMuseum/")).toBe(
      "/LM3DMuseum/models/item.glb",
    );
    expect(assetUrl("/posters/item.webp", "/LM3DMuseum/")).toBe(
      "/LM3DMuseum/posters/item.webp",
    );
    expect(assetUrl("models/item.glb", "/")).toBe("/models/item.glb");
  });
  it("preserves external HTTPS assets but rejects unsafe paths", () => {
    expect(assetUrl("https://cdn.example.com/model.glb", "/museum/")).toBe(
      "https://cdn.example.com/model.glb",
    );
    for (const path of [
      "http://example.com/x",
      "//example.com/x",
      "../x",
      "javascript:alert(1)",
    ])
      expect(() => assetUrl(path)).toThrow();
  });
  it("round-trips non-ASCII IDs and handles malformed or stale URLs", () => {
    expect(parseRoute(exhibitHref("展品 一"))).toEqual({
      page: "exhibit",
      id: "展品 一",
    });
    expect(parseRoute("")).toEqual({ page: "home" });
    expect(parseRoute("#/collection")).toEqual({ page: "collection" });
    expect(parseRoute("#/exhibit/%E0%A4%A")).toEqual({ page: "not-found" });
    expect(parseRoute("#/missing")).toEqual({ page: "not-found" });
  });
});
