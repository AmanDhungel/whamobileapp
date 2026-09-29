import { useMutation } from "@tanstack/react-query";

import * as authApi from "@/api/auth";
import { getErrorMessage } from "@/api/errors";
import type { AuthSession, RegisterResponse } from "@/api/types";
import { showToast } from "@/components/Toast";
import { useAuthStore } from "@/store/authStore";

const toastError = (fallback: string) => (error: unknown) =>
  showToast({ type: "error", message: getErrorMessage(error, fallback) });

function isSession(data: RegisterResponse): data is AuthSession {
  return "accessToken" in data && !!data.accessToken;
}

export type LoginType = "user" | "business";

/** On success the root layout's guards move the user to the right area by category. */
export function useLogin(type: LoginType) {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      authApi.login({ ...values, category: type }),
    onSuccess: (session) => signIn(session),
    onError: toastError("Invalid email or password. Please try again."),
  });
}

export type RegisterOutcome = { signedIn: true } | { signedIn: false; message: string };

async function finishRegistration(
  result: Awaited<ReturnType<typeof authApi.registerUser>>,
  signIn: (session: AuthSession) => Promise<void>,
): Promise<RegisterOutcome> {
  const { data, meta } = result;
  if (isSession(data)) {
    await signIn(data);
    return { signedIn: true };
  }
  // 201 { user, tokens:null } — the account exists; fall back to /auth/login.
  const message =
    typeof meta?.message === "string" ? meta.message : "Account created, please log in";
  return { signedIn: false, message };
}

export function useRegister() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: async (values: {
      name: string;
      email: string;
      password: string;
      accpetalltermsandcondition: boolean;
    }): Promise<RegisterOutcome> => finishRegistration(await authApi.registerUser(values), signIn),
    onError: toastError("Signup failed. Please try again."),
  });
}

export function useRegisterBusiness() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: async (
      values: Parameters<typeof authApi.registerBusiness>[0],
    ): Promise<RegisterOutcome> =>
      finishRegistration(await authApi.registerBusiness(values), signIn),
    onError: toastError("Registration failed. Please try again."),
  });
}

export function useGoogleSignInMutation() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: (idToken: string) => authApi.socialSignIn({ idToken, provider: "google" }),
    onSuccess: (session) => signIn(session),
    onError: toastError("Google sign-in failed. Please try again."),
  });
}

export function useSendSignupCode() {
  return useMutation({
    mutationFn: (email: string) => authApi.sendSignupCode({ email }),
    onSuccess: () =>
      showToast({ type: "success", message: "Verification code sent to your email" }),
    onError: toastError("Failed to send verification code"),
  });
}

export function useVerifySignupCode() {
  return useMutation({
    mutationFn: (values: { email: string; code: string }) => authApi.verifySignupCode(values),
    onSuccess: () => showToast({ type: "success", message: "Email verified" }),
    onError: toastError("Incorrect code"),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    onSuccess: () => showToast({ type: "success", message: "Reset code sent to your email" }),
    onError: toastError("Something went wrong"),
  });
}

export function useVerifyResetCode() {
  return useMutation({
    mutationFn: (values: { email: string; code: string }) => authApi.verifyResetCode(values),
    onSuccess: () => showToast({ type: "success", message: "Code verified successfully!" }),
    onError: toastError("Invalid or expired code."),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (values: { email: string; code: string; password: string }) =>
      authApi.resetPassword(values),
    onSuccess: (data) =>
      showToast({ type: "success", message: data.message || "Password updated successfully" }),
    onError: toastError("Could not reset your password. Please try again."),
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({ mutationFn: () => logout() });
}

/** App Store requirement. Anonymises the account server-side, then drops the local session. */
export function useDeleteAccount() {
  const clearLocalSession = useAuthStore((s) => s.clearLocalSession);
  return useMutation({
    mutationFn: () => authApi.deleteMe(),
    onSuccess: async () => {
      await clearLocalSession();
      showToast({ type: "success", message: "Your account has been deleted" });
    },
    onError: toastError("Could not delete your account. Please try again."),
  });
}
