import * as ImagePicker from "expo-image-picker";

import type { UploadFile } from "@/api/types";

export interface PickImagesOptions {
  /** Max number of images to return. */
  limit: number;
  /** Skip files larger than this (bytes). */
  maxBytes?: number;
  /** Square crop UI (single image only — incompatible with multi-select). */
  squareCrop?: boolean;
}

export interface PickImagesResult {
  files: UploadFile[];
  /** Names of files skipped for being too large. */
  skipped: string[];
}

function extensionFor(mime?: string | null) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "jpg";
}

/**
 * Opens the photo library (no permission prompt needed for the picker itself) and
 * returns RN-FormData-ready file parts. Empty result when the user cancels.
 */
export async function pickImages({
  limit,
  maxBytes,
  squareCrop = false,
}: PickImagesOptions): Promise<PickImagesResult> {
  const multi = limit > 1 && !squareCrop;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multi,
    selectionLimit: multi ? limit : 1,
    allowsEditing: squareCrop,
    aspect: squareCrop ? [1, 1] : undefined,
    quality: 0.8,
  });
  if (result.canceled) return { files: [], skipped: [] };

  const files: UploadFile[] = [];
  const skipped: string[] = [];
  result.assets.forEach((asset, i) => {
    const name = asset.fileName ?? `photo-${Date.now()}-${i}.${extensionFor(asset.mimeType)}`;
    if (maxBytes && asset.fileSize && asset.fileSize > maxBytes) {
      skipped.push(name);
      return;
    }
    files.push({ uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" });
  });
  return { files: files.slice(0, limit), skipped };
}
