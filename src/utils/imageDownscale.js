// Client-side downscale before an image ever leaves the browser: a phone photo
// (5-10 MB) becomes a small JPEG (~100 KB) the lookup API can embed quickly.
// The full-resolution bytes are never uploaded and never persisted.

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;
const JPEG_TYPE = "image/jpeg";

/**
 * Longest side clamped to maxDimension, aspect ratio preserved. Images
 * already within bounds are left untouched (no upscaling).
 */
export function computeTargetSize(width, height, maxDimension = MAX_DIMENSION) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

function drawScaled(img, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed")),
      JPEG_TYPE,
      quality
    );
  });
}

/**
 * Downscale an image File/Blob to a JPEG Blob no larger than maxDimension on
 * its longest side.
 */
export async function downscaleImage(
  file,
  { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}
) {
  const { img, objectUrl } = await loadImage(file);
  try {
    const { width, height } = computeTargetSize(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxDimension
    );
    const canvas = drawScaled(img, width, height);
    return await canvasToBlob(canvas, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
