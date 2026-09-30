import { StripeProvider } from "@stripe/stripe-react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import type { ReactNode } from "react";

import { env } from "@/utils/env";

/** Expo Go (card payments only) vs. a development/production build (wallets too). */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * URL Stripe uses to return to the app after 3D Secure / redirect flows. Expo Go
 * needs the "/--/" form (docs: docs.expo.dev/versions/latest/sdk/stripe).
 */
export function stripeUrlScheme(): string {
  return isExpoGo ? Linking.createURL("/--/") : Linking.createURL("");
}

export function stripeReturnURL(): string {
  return Linking.createURL("stripe-redirect");
}

/** Wallet support: Google Pay needs a native build; Apple Pay also needs a merchant ID (not set yet). */
export const walletPayments = {
  googlePay: !isExpoGo,
  applePay: false,
};

/** Provides the Stripe SDK to the app with the key for this build profile (see utils/env). */
export function PaymentsProvider({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={env.stripe.publishableKey} urlScheme={stripeUrlScheme()}>
      <>{children}</>
    </StripeProvider>
  );
}
