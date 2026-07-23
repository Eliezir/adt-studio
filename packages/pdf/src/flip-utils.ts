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
import type { StreamOp, ImageStreamOp } from "./page-stream-recorder.js";

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
      Buffer.from(decoded.data.buffer).copy(
        flipped,
        dstOffset,
        srcOffset,
        srcOffset + width * 4
      );
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
 * Find the stream operation that matches an extracted image.
 * Uses contentDigest (pixel hash) for precise matching when available,
 * falls back to dimension-based matching for images without digest.
 */
function findMatchingStreamOp(
  image: ExtractedImage,
  streamOps: StreamOp[]
): ImageStreamOp | undefined {
  // First, try to match by contentDigest if available (most precise)
  if (image.hash) {
    for (const op of streamOps) {
      if (op.kind !== "image" && op.kind !== "imageMask") continue;
      if (
        op.nativeWidth === image.width &&
        op.nativeHeight === image.height &&
        (op as ImageStreamOp).contentDigest === image.hash
      ) {
        return op as ImageStreamOp;
      }
    }
  }

  // Fallback: match by dimensions only (less precise, used when digest unavailable)
  for (const op of streamOps) {
    if (op.kind !== "image" && op.kind !== "imageMask") continue;
    if (op.nativeWidth === image.width && op.nativeHeight === image.height) {
      return op as ImageStreamOp;
    }
  }

  return undefined;
}

/**
 * Apply CTM-based flip transforms to raster images based on stream operations.
 * Updates image buffers and hashes in-place.
 * 
 * Uses precise content-based matching when digests are available (preferred),
 * falls back to dimension matching for images without digests.
 */
export function applyFlipsToRasterImages(
  images: ExtractedImage[],
  streamOps: StreamOp[]
): void {
  if (streamOps.length === 0 || images.length === 0) return;

  for (const image of images) {
    const streamOp = findMatchingStreamOp(image, streamOps);

    if (!streamOp || !streamOp.currentTransformationMatrix) continue;

    const { flipHorizontal, flipVertical } = detectFlipFromCurrentTransformationMatrix(streamOp.currentTransformationMatrix);
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
