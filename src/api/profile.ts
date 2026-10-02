import { prepareImagesForUpload } from "@/services/imageUpload";

import { apiRequest } from "./client";
import type {
  EditProfileRequest,
  UpdateProfileRequest,
  UploadFile,
  UploadProfilePicResponse,
} from "./types";

/**
 * PATCH /api/user/update (bearer OK). The route $sets BOTH name and image, so always
 * pass the current image or it would be cleared. Its response is the raw user
 * document (which leaks private fields) — deliberately discarded; callers re-read /me.
 */
export async function updateProfile(body: UpdateProfileRequest): Promise<void> {
  await apiRequest<unknown>("/api/user/update", { method: "PATCH", body });
}

/**
 * POST /api/edit-profile — phone / address. Still cookie-only on the backend (a bearer
 * swap is in progress), so `lenient`: a bare 401 means "not available yet" and must
 * not log the user out. Response is discarded (raw user doc); re-read /me.
 */
export async function editProfile(body: EditProfileRequest): Promise<void> {
  await apiRequest<unknown>("/api/edit-profile", {
    method: "POST",
    body,
    authMode: "lenient",
  });
}

/**
 * POST /api/upload-profile-pic — FormData field `file`. Uploads to S3 and sets
 * user.image server-side. Cookie-only today → `lenient` (see editProfile).
 */
export async function uploadProfilePic(file: UploadFile): Promise<string> {
  const upload = await prepareImagesForUpload([file]);
  const form = new FormData();
  if (upload.files[0]) form.append("file", upload.files[0]);
  const res = await apiRequest<UploadProfilePicResponse>("/api/upload-profile-pic", {
    method: "POST",
    body: form,
    authMode: "lenient",
    uploadBytes: upload.totalBytes,
  });
  return res.data.url;
}
