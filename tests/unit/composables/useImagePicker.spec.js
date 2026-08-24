import { describe, it, expect } from "vitest";
import { extractImageFile } from "@/composables/useImagePicker";

describe("extractImageFile (paste handler)", () => {
  it("returns the first image file from clipboardData.files", () => {
    const textFile = { type: "text/plain" };
    const imageFile = { type: "image/png" };
    const clipboardData = { files: [textFile, imageFile] };
    expect(extractImageFile(clipboardData)).toBe(imageFile);
  });

  it("falls back to clipboardData.items when there are no files", () => {
    const imageFile = { type: "image/jpeg" };
    const clipboardData = {
      files: [],
      items: [
        { kind: "string", type: "text/plain" },
        { kind: "file", type: "image/jpeg", getAsFile: () => imageFile },
      ],
    };
    expect(extractImageFile(clipboardData)).toBe(imageFile);
  });

  it("returns null when nothing pasted is an image", () => {
    const clipboardData = { files: [{ type: "text/plain" }], items: [] };
    expect(extractImageFile(clipboardData)).toBeNull();
  });

  it("returns null for a missing clipboardData (e.g. programmatic paste event)", () => {
    expect(extractImageFile(null)).toBeNull();
  });
});
