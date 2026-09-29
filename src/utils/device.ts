import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { Platform as ApiPlatform } from "@/api/types";

const DEVICE_ID_KEY = "wha.deviceId";

let cachedDeviceId: string | null = null;

/** Stable per-install id, generated once and kept in secure storage. */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  cachedDeviceId = id;
  return id;
}

export const platform: ApiPlatform = Platform.OS === "ios" ? "ios" : "android";

export async function getDeviceInfo(): Promise<{ deviceId: string; platform: ApiPlatform }> {
  return { deviceId: await getDeviceId(), platform };
}
