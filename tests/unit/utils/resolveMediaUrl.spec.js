import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

describe("resolveMediaUrl", () => {
  const originalApiUrl = process.env.VUE_APP_API_URL;

  beforeEach(() => {
    process.env.VUE_APP_API_URL = "http://localhost:8100";
  });

  afterEach(() => {
    process.env.VUE_APP_API_URL = originalApiUrl;
  });

  it("prefixes a relative /media path with the backend origin", () => {
    expect(resolveMediaUrl("/media/products/x.jpg")).toBe(
      "http://localhost:8100/media/products/x.jpg"
    );
  });

  it("passes an absolute URL through untouched", () => {
    expect(resolveMediaUrl("https://cdn.example.com/x.jpg")).toBe(
      "https://cdn.example.com/x.jpg"
    );
  });

  it("returns an empty string for a falsy input", () => {
    expect(resolveMediaUrl("")).toBe("");
    expect(resolveMediaUrl(null)).toBe("");
    expect(resolveMediaUrl(undefined)).toBe("");
  });
});
