import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Running inside the Expo Go app (vs. a development / preview / production build).
 * Expo Go only ships its own native modules — features built on others (Google
 * sign-in, wallets) must check this before touching them.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
