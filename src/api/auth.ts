import { getDeviceInfo } from "@/utils/device";
import { prepareImagesForUpload } from "@/services/imageUpload";

import { apiRequest, apiRequestWithMeta, MOBILE_API, type ApiResult } from "./client";
import type {
  AuthSession,
  EmailCodeRequest,
  EmailRequest,
  ForgotPasswordRequest,
  GuestIdentityRequest,
  LegacyMessageResponse,
  LoginRequest,
  LogoutRequest,
  MeData,
  MessageData,
  RegisterBusinessRequest,
  RegisterResponse,
  RegisterUserRequest,
  ResetPasswordRequest,
  SocialSignInRequest,
  SuccessData,
} from "./types";

// Emails are always normalised client-side: the backend lowercases in most places but
// NOT in setNewPassword (server/lib/passwordReset.ts), so a mixed-case email would
// fail the final reset step.
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ─── Mobile auth (/api/mobile/v1/*, {data,error,meta} envelope) ─────────────────

/** `category:"business"` also matches super-admin accounts server-side. */
export async function login(
  body: Omit<LoginRequest, "deviceId" | "platform">,
): Promise<AuthSession> {
  return apiRequest<AuthSession>(`${MOBILE_API}/auth/login`, {
    method: "POST",
    auth: false,
    body: { ...body, email: normalizeEmail(body.email), ...(await getDeviceInfo()) },
  });
}

/** Consumer signup — multipart FormData, same fields as the web user-signup route. */
export async function registerUser(
  body: Omit<RegisterUserRequest, "deviceId" | "platform">,
): Promise<ApiResult<RegisterResponse>> {
  const { deviceId, platform } = await getDeviceInfo();
  const form = new FormData();
  form.append("category", "user");
  form.append("name", body.name.trim());
  form.append("email", normalizeEmail(body.email));
  form.append("password", body.password);
  form.append("accpetalltermsandcondition", String(body.accpetalltermsandcondition));
  form.append("deviceId", deviceId);
  form.append("platform", platform);
  const upload = await prepareImagesForUpload(body.image ? [body.image] : []);
  // RN FormData file part — typed loosely by React Native's lib.
  if (upload.files[0]) form.append("image", upload.files[0] as unknown as Blob);
  return apiRequestWithMeta<RegisterResponse>(`${MOBILE_API}/auth/register`, {
    method: "POST",
    auth: false,
    body: form,
    uploadBytes: upload.totalBytes,
  });
}

/**
 * Business signup — multipart FormData with exactly the fields the web
 * BusinessSignupPage sends (components/Auth/BusinessSignupPage.tsx onSubmit):
 * `image` = first venue image (cover), `venue_image_0..8` = the rest.
 */
export async function registerBusiness(
  body: Omit<RegisterBusinessRequest, "deviceId" | "platform">,
): Promise<ApiResult<RegisterResponse>> {
  const { deviceId, platform } = await getDeviceInfo();
  const form = new FormData();
  form.append("category", "business");
  form.append("business_name", body.business_name.trim());
  form.append("business_category", body.business_category);
  form.append("name", body.name.trim());
  form.append("email", normalizeEmail(body.email));
  form.append("password", body.password);
  form.append("phone_number", body.phone_number.trim());
  form.append("location", body.location);
  if (body.latitude != null) form.append("latitude", String(body.latitude));
  if (body.longitude != null) form.append("longitude", String(body.longitude));
  if (body.is24_7) form.append("is24_7", "true");
  if (body.community.length) form.append("community", JSON.stringify(body.community));
  form.append("schedule", JSON.stringify(body.schedule));
  form.append("accpetalltermsandcondition", String(body.accpetalltermsandcondition));
  // Resized/re-encoded JPEGs, the whole set under the request-size budget.
  const upload = await prepareImagesForUpload(body.images);
  const [cover, ...rest] = upload.files;
  // RN FormData file parts — typed loosely by React Native's lib.
  if (cover) form.append("image", cover as unknown as Blob);
  rest.forEach((img, i) => form.append(`venue_image_${i}`, img as unknown as Blob));
  form.append("deviceId", deviceId);
  form.append("platform", platform);
  return apiRequestWithMeta<RegisterResponse>(`${MOBILE_API}/auth/register`, {
    method: "POST",
    auth: false,
    body: form,
    uploadBytes: upload.totalBytes,
  });
}

export async function logout(body: LogoutRequest): Promise<SuccessData> {
  return apiRequest<SuccessData>(`${MOBILE_API}/auth/logout`, {
    method: "POST",
    auth: false,
    body,
  });
}

export async function forgotPassword(body: ForgotPasswordRequest): Promise<MessageData> {
  return apiRequest<MessageData>(`${MOBILE_API}/auth/forgot-password`, {
    method: "POST",
    auth: false,
    body: { email: normalizeEmail(body.email) },
  });
}

export async function resetPassword(body: ResetPasswordRequest): Promise<MessageData> {
  return apiRequest<MessageData>(`${MOBILE_API}/auth/reset-password`, {
    method: "POST",
    auth: false,
    body: { ...body, email: normalizeEmail(body.email), code: body.code.trim() },
  });
}

export async function socialSignIn(
  body: Omit<SocialSignInRequest, "deviceId" | "platform">,
): Promise<AuthSession> {
  return apiRequest<AuthSession>(`${MOBILE_API}/auth/social`, {
    method: "POST",
    auth: false,
    body: { ...body, ...(await getDeviceInfo()) },
  });
}

/**
 * Guest-checkout identity (409 if the email belongs to a password account).
 * Not used in Phase A — the event-ticket checkout will call this.
 */
export async function guestIdentity(
  body: Omit<GuestIdentityRequest, "deviceId" | "platform">,
): Promise<AuthSession> {
  return apiRequest<AuthSession>(`${MOBILE_API}/auth/guest`, {
    method: "POST",
    auth: false,
    body: { ...body, email: normalizeEmail(body.email), ...(await getDeviceInfo()) },
  });
}

export async function getMe(): Promise<MeData> {
  return apiRequest<MeData>(`${MOBILE_API}/me`);
}

export async function deleteMe(): Promise<SuccessData> {
  return apiRequest<SuccessData>(`${MOBILE_API}/me`, { method: "DELETE" });
}

// ─── Legacy (pre-mobile) routes still needed by the mobile flows ────────────────

/** Pre-signup 6-digit code. 400 if the email already has an account. */
export async function sendSignupCode(body: EmailRequest): Promise<LegacyMessageResponse> {
  return apiRequest<LegacyMessageResponse>("/api/auth/send-verification-code", {
    method: "POST",
    auth: false,
    body: { email: normalizeEmail(body.email) },
  });
}

export async function verifySignupCode(body: EmailCodeRequest): Promise<LegacyMessageResponse> {
  return apiRequest<LegacyMessageResponse>("/api/auth/verify-signup-code", {
    method: "POST",
    auth: false,
    body: { email: normalizeEmail(body.email), code: body.code.trim() },
  });
}

/**
 * Password-reset code pre-check — POST /api/mobile/v1/auth/verify-reset-code
 * (added backend-side after Phase A; mirrors the web /api/auth/verify-code exactly).
 */
export async function verifyResetCode(body: EmailCodeRequest): Promise<MessageData> {
  return apiRequest<MessageData>(`${MOBILE_API}/auth/verify-reset-code`, {
    method: "POST",
    auth: false,
    body: { email: normalizeEmail(body.email), code: body.code.trim() },
  });
}
