import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { ApiError } from "@/api/errors";
import type { UploadFile } from "@/api/types";

// Every photo is re-encoded on-device before it goes into a multipart body:
// full-resolution library photos (iPhone HEIC/JPEG, 3–8 MB each) blow past the
// backend's request-size limits — 10 MB through the Next proxy locally, 4.5 MB on
// Vercel in production — and the server then drops the connection mid-upload.

/** Files budget for one request: well under Vercel's 4.5 MB, leaving room for fields. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

/** Tried in order until the whole set fits the budget. First step is the norm. */
const STEPS = [
  { maxSide: 1600, quality: 0.7 },
  { maxSide: 1600, quality: 0.55 },
  { maxSide: 1280, quality: 0.5 },
  { maxSide: 1024, quality: 0.4 },
] as const;

type Step = (typeof STEPS)[number];

export interface PreparedUpload {
  files: UploadFile[];
  totalBytes: number;
}

function jpegName(name: string, index: number): string {
  const base = name.replace(/\.[^.]*$/, "").replace(/[^\w-]+/g, "_") || `photo-${index + 1}`;
  return `${base}.jpg`;
}

/** Resize so the longest side is at most `maxSide`, then save as JPEG. */
async function encode(file: UploadFile, index: number, step: Step) {
  const context = ImageManipulator.manipulate(file.uri);
  const original = await context.renderAsync();
  const { width, height } = original;
  original.release();

  if (Math.max(width, height) > step.maxSide) {
    context.reset();
    context.resize(width >= height ? { width: step.maxSide } : { height: step.maxSide });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: step.quality, format: SaveFormat.JPEG });
  image.release();
  context.release();

  const bytes = new File(saved.uri).size ?? 0;
  const part: UploadFile = { uri: saved.uri, name: jpegName(file.name, index), type: "image/jpeg" };
  return { part, bytes };
}

/**
 * Converts picked photos to upload-ready JPEGs (max 1600 px, quality ~0.7), lowering
 * quality/size further only if the set would exceed `maxTotalBytes`.
 */
export async function prepareImagesForUpload(
  files: UploadFile[],
  maxTotalBytes: number = MAX_UPLOAD_BYTES,
): Promise<PreparedUpload> {
  if (!files.length) return { files: [], totalBytes: 0 };

  let result: PreparedUpload = { files: [], totalBytes: 0 };
  try {
    for (const step of STEPS) {
      // Sequential: each decode of a full-size photo is memory-heavy.
      const encoded: { part: UploadFile; bytes: number }[] = [];
      for (const [i, file] of files.entries()) encoded.push(await encode(file, i, step));
      result = {
        files: encoded.map((e) => e.part),
        totalBytes: encoded.reduce((sum, e) => sum + e.bytes, 0),
      };
      if (__DEV__) {
        console.log(
          `[upload] ${files.length} photo(s) at ${step.maxSide}px q${step.quality}: ` +
            `${(result.totalBytes / 1024).toFixed(0)} KB (budget ${(maxTotalBytes / 1024).toFixed(0)} KB)`,
        );
      }
      if (result.totalBytes <= maxTotalBytes) break;
    }
  } catch (err) {
    if (__DEV__) console.warn("[upload] image conversion failed:", err);
    throw new ApiError("Couldn't prepare your photos. Please try different ones.", 0);
  }
  return result;
}
