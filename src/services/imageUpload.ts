import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { ApiError } from "@/api/errors";
import type { UploadFile } from "@/api/types";

// FormData file parts must be expo-file-system `File` objects. Since SDK 57 the
// global fetch is expo/fetch, which rejects React Native-style { uri, name, type }
// parts ("Unsupported FormDataPart implementation") before anything is sent.
//
// Every photo is also re-encoded on-device first: full-resolution library photos
// (iPhone HEIC/JPEG, 3–8 MB each) blow past the backend's request-size limits —
// 10 MB through the Next proxy locally, 4.5 MB on Vercel in production.

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
  /** JPEGs (name "<id>.jpg", type "image/jpeg") — append to FormData as they are. */
  files: File[];
  totalBytes: number;
}

/** Resize so the longest side is at most `maxSide`, then save as JPEG. */
async function encode(file: UploadFile, step: Step): Promise<File> {
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
  return new File(saved.uri);
}

/**
 * Converts picked photos to upload-ready JPEG files (max 1600 px, quality ~0.7),
 * lowering quality/size further only if the set would exceed `maxTotalBytes`.
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
      const encoded: File[] = [];
      for (const file of files) encoded.push(await encode(file, step));
      result = {
        files: encoded,
        totalBytes: encoded.reduce((sum, f) => sum + (f.size ?? 0), 0),
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
