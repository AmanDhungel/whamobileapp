import { create } from "zustand";

/**
 * Global "you need an account for this" sheet (docs 06: the web's auth-modal state,
 * ported as a store rather than prop-drilled). Any protected action calls
 * `requestLogin("Sign in to save favorites")`; <LoginPromptSheet /> at the root renders it.
 */
interface LoginPromptState {
  visible: boolean;
  message: string;
  requestLogin: (message: string) => void;
  dismiss: () => void;
}

export const useLoginPromptStore = create<LoginPromptState>()((set) => ({
  visible: false,
  message: "",
  requestLogin: (message) => set({ visible: true, message }),
  dismiss: () => set({ visible: false }),
}));

export const requestLogin = (message: string) =>
  useLoginPromptStore.getState().requestLogin(message);
