/**
 * Client-side image processing: validates MIME types, converts HEIC→JPEG
 * via Canvas API, and compresses/resizes images before upload.
 */

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_DIMENSION = 1600; // max width or height
const JPEG_QUALITY = 0.85;

/**
 * Validates and processes an image file for upload.
 * - Converts HEIC/HEIF to JPEG via Canvas
 * - Resizes large images down to MAX_DIMENSION
 * - Compresses JPEG output
 * Returns a File ready for upload, or throws on invalid input.
 */
export async function processImage(file: File): Promise<File> {
  const type = file.type.toLowerCase();

  // If it's already a standard web format and small enough, pass through
  if (ACCEPTED_TYPES.has(type) && file.size < 500_000) {
    return file;
  }

  // For HEIC/HEIF or unknown types, or for large images, re-encode via Canvas
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale down if needed
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image conversion failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  // Generate a clean filename
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

/**
 * Returns a data URL preview for a file, suitable for <img src>.
 */
export function createPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
