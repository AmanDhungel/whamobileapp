import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/api/errors";
import { editProfile, updateProfile, uploadProfilePic } from "@/api/profile";
import type { EditProfileRequest, UploadFile } from "@/api/types";
import { useAuthStore } from "@/store/authStore";

/**
 * /api/upload-profile-pic and /api/edit-profile don't accept bearer tokens yet (a
 * backend change is in progress). They're called in "lenient" mode, so their 401
 * surfaces here instead of logging the user out.
 */
export function isNotAvailableYet(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === null;
}

export const NOT_AVAILABLE_YET =
  "Not available yet — you can change this on whaustralia.com for now.";

/** Name — PATCH /api/user/update (bearer OK). Re-sends the current image (see api/profile). */
export function useUpdateName() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  return useMutation({
    mutationFn: ({ name, image }: { name: string; image?: string }) =>
      updateProfile({ name: name.trim(), image }),
    // Best effort: the change itself succeeded even if re-reading /me fails.
    onSuccess: () => refreshUser().catch(() => undefined),
  });
}

/** Photo — POST /api/upload-profile-pic (sets user.image server-side). */
export function useUploadProfilePhoto() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  return useMutation({
    mutationFn: (file: UploadFile) => uploadProfilePic(file),
    // Best effort: the change itself succeeded even if re-reading /me fails.
    onSuccess: () => refreshUser().catch(() => undefined),
  });
}

/** Phone / address — POST /api/edit-profile. */
export function useEditContactDetails() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  return useMutation({
    mutationFn: (body: EditProfileRequest) => editProfile(body),
    // Best effort: the change itself succeeded even if re-reading /me fails.
    onSuccess: () => refreshUser().catch(() => undefined),
  });
}
