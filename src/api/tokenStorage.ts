import * as SecureStore from "expo-secure-store";

import type { AuthTokens, AuthUser } from "./types";

// Tokens live ONLY in expo-secure-store (never AsyncStorage). Kept in memory after the
// first load so every request doesn't hit the keychain.

const KEYS = {
  accessToken: "wha.accessToken",
  refreshToken: "wha.refreshToken",
  accessExpiresAt: "wha.accessExpiresAt",
  user: "wha.user",
} as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  accessExpiresAt: number;
}

let memory: StoredTokens | null = null;
let loaded = false;
// Bumped on every clearSession(), so an in-flight refresh that resolves after a
// logout can tell it must not write its tokens back.
let generation = 0;

export function getSessionGeneration(): number {
  return generation;
}

export async function loadTokens(): Promise<StoredTokens | null> {
  if (loaded) return memory;
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.accessExpiresAt),
  ]);
  memory =
    accessToken && refreshToken
      ? { accessToken, refreshToken, accessExpiresAt: Number(expiresAt) || 0 }
      : null;
  loaded = true;
  return memory;
}

export function getTokens(): StoredTokens | null {
  return memory;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  const next: StoredTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  memory = next;
  loaded = true;
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, next.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, next.refreshToken),
    SecureStore.setItemAsync(KEYS.accessExpiresAt, String(next.accessExpiresAt)),
  ]);
}

export async function loadCachedUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveCachedUser(user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}

/** Clears tokens + cached user. The device id is intentionally kept. */
export async function clearSession(): Promise<void> {
  generation += 1;
  memory = null;
  loaded = true;
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
}
