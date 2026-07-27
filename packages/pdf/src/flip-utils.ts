/**
 * Image Flip Transform Utilities
 *
 * Detects and applies current transformation matrix (CTM) based flip transformations 
 * to raster images extracted from PDFs. Handles both JPEG and PNG formats.
 */

import { createHash } from "crypto";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { decodePng } from "./png-utils.js";
import type { ExtractedImage } from "./extract.js";

/**
 * Hash a buffer to a 16-character hex string.
 * Avoids circular dependency by defining locally instead of importing from extract.
 */
function hashBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

/**
 * Detect if image needs horizontal/vertical flip based on current transformation matrix.
 * Negative X scale (a < 0) = horizontal flip; negative Y scale (d < 0) = vertical flip.
 * Scope: axis-aligned flips only. This intentionally ignores b/c (rotation/skew)
 * terms from the CTM; suitable for current storybook inputs, but not a full
 * affine-orientation solver for arbitrary rotations.
 */
export interface ImageFlipTransform {
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export function detectFlipFromCurrentTransformationMatrix(currentTransformationMatrix: number[]): ImageFlipTransform {
  const [a, , , d] = currentTransformationMatrix; // [a, b, c, d, e, f]
  return {
    flipHorizontal: a < 0, // Negative X scale
    flipVertical: d < 0,   // Negative Y scale
  };
}

/**
 * Flip image buffer horizontally (left-right mirror).
 * Handles both JPEG and PNG formats.
 *
 * JPEG tradeoff: this path decodes to RGBA, flips pixels, then re-encodes at
 * quality 90. That is lossy for already-compressed JPEGs (generational loss),
 * even though geometric flip can be represented losslessly in JPEG.
 * Chosen intentionally for now to keep a pure JS/TS dependency-light path.
 */
export function flipImageBufferHorizontal(
  buffer: Buffer,
  format: string
): Buffer {
  if (format === "jpeg") {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    const { width, height } = decoded;
    const flipped = Buffer.alloc(decoded.data.length);

    // For each row, reverse pixel order (4 bytes per pixel = RGBA)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * width + (width - 1 - x)) * 4;
        flipped[dstIdx] = decoded.data[srcIdx];
        flipped[dstIdx + 1] = decoded.data[srcIdx + 1];
        flipped[dstIdx + 2] = decoded.data[srcIdx + 2];
        flipped[dstIdx + 3] = decoded.data[srcIdx + 3];
      }
    }

    const encoded = jpeg.encode(
      { data: flipped, width, height },
      90 // Maintain quality
    );
    return Buffer.from(encoded.data);
  }

  if (format === "png") {
    const { data, width, height } = decodePng(buffer);
    const flipped = Buffer.alloc(data.length);

    // For each row, reverse pixel order (4 bytes per pixel = RGBA)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * width + (width - 1 - x)) * 4;
        flipped[dstIdx] = data[srcIdx];
        flipped[dstIdx + 1] = data[srcIdx + 1];
        flipped[dstIdx + 2] = data[srcIdx + 2];
        flipped[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    const png = new PNG({ width, height });
    png.data = flipped;
    return PNG.sync.write(png);
  }

  return buffer; // Unknown format
}

/**
 * Flip image buffer vertically (top-bottom mirror).
 *
 * JPEG tradeoff: this path decodes to RGBA, flips pixels, then re-encodes at
 * quality 90. That is lossy for already-compressed JPEGs (generational loss).
 */
export function flipImageBufferVertical(
  buffer: Buffer,
  format: string
): Buffer {
  if (format === "jpeg") {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    const { width, height } = decoded;
    const flipped = Buffer.alloc(decoded.data.length);

    // Reverse row order
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      const srcOffset = srcY * width * 4;
      const dstOffset = y * width * 4;
      flipped.set(decoded.data.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    const encoded = jpeg.encode(
      { data: flipped, width, height },
      90
    );
    return Buffer.from(encoded.data);
  }

  if (format === "png") {
    const { data, width, height } = decodePng(buffer);
    const flipped = Buffer.alloc(data.length);

    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y;
      const srcOffset = srcY * width * 4;
      const dstOffset = y * width * 4;
      data.copy(flipped, dstOffset, srcOffset, srcOffset + width * 4);
    }

    const png = new PNG({ width, height });
    png.data = flipped;
    return PNG.sync.write(png);
  }

  return buffer;
}

/**
 * Apply CTM-based flip transforms to raster images.
 * Updates image buffers and hashes in-place.
 *
 * Flip direction is pre-stamped per image by `stampRasterPlacementsFromOps`
 * during the consuming op->image match pass.
 */
export function applyFlipsToRasterImages(
  images: ExtractedImage[]
): void {
  if (images.length === 0) return;

  for (const image of images) {
    const { flipHorizontal, flipVertical } = image.flipTransform ?? {
      flipHorizontal: false,
      flipVertical: false,
    };
    if (!flipHorizontal && !flipVertical) continue;

    let flippedBuf = image.buffer;

    if (flipHorizontal) {
      flippedBuf = flipImageBufferHorizontal(flippedBuf, image.format);
    }
    if (flipVertical) {
      flippedBuf = flipImageBufferVertical(flippedBuf, image.format);
    }

    // Update the image with the flipped buffer and recalculate hash
    image.buffer = flippedBuf;
    image.hash = hashBuffer(flippedBuf);
  }
}
