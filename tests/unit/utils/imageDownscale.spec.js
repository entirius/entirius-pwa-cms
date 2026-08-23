import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeTargetSize, downscaleImage } from "@/utils/imageDownscale";

describe("computeTargetSize", () => {
  it("leaves images within the max dimension untouched", () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("clamps the longer side to 1024 and keeps the aspect ratio", () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1024, height: 768 });
  });

  it("clamps a portrait image on its (taller) height", () => {
    expect(computeTargetSize(1500, 3000)).toEqual({ width: 512, height: 1024 });
  });

  it("respects a custom max dimension", () => {
    expect(computeTargetSize(2000, 1000, 500)).toEqual({
      width: 500,
      height: 250,
    });
  });
});

describe("downscaleImage", () => {
  const drawImage = vi.fn();
  let createElementSpy;

  beforeEach(() => {
    drawImage.mockClear();

    vi.stubGlobal(
      "Image",
      class {
        set src(_value) {
          queueMicrotask(() => this.onload && this.onload());
        }
      }
    );

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-object-url"),
      revokeObjectURL: vi.fn(),
    });

    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag !== "canvas") return originalCreateElement(tag);
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toBlob: (cb, type, quality) =>
            cb(new Blob(["fake"], { type }), quality),
        };
      });
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("returns a JPEG blob scaled from the source image dimensions", async () => {
    global.Image.prototype.naturalWidth = 4000;
    global.Image.prototype.naturalHeight = 2000;

    const file = new Blob(["source-bytes"], { type: "image/png" });
    const blob = await downscaleImage(file);

    expect(blob.type).toBe("image/jpeg");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1024, 512);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-object-url");
  });
});
