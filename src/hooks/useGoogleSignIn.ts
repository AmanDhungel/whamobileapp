import { useRef, useState } from "react";

import { showToast } from "@/components/Toast";
import {
  GoogleSignInError,
  getGoogleIdToken,
  getGoogleSignInAvailability,
} from "@/services/googleSignIn";

import { useGoogleSignInMutation } from "./useAuthActions";

/**
 * Native Google sign-in → POST /auth/social → same session handling as email login
 * (the root layout routes by user.category). Cancelling the picker is silent; taps
 * while a sign-in is running are ignored.
 */
export function useGoogleSignIn() {
  const mutation = useGoogleSignInMutation();
  const running = useRef(false);
  const [picking, setPicking] = useState(false);

  const start = async () => {
    if (running.current) return;
    running.current = true;
    setPicking(true);
    try {
      const result = await getGoogleIdToken();
      if (result.type === "cancelled") return;
      await mutation.mutateAsync(result.idToken);
    } catch (err) {
      // API errors are reported by the mutation's onError.
      if (err instanceof GoogleSignInError) showToast({ type: "error", message: err.message });
    } finally {
      running.current = false;
      setPicking(false);
    }
  };

  return {
    availability: getGoogleSignInAvailability(),
    start: () => void start(),
    loading: picking || mutation.isPending,
  };
}
