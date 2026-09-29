import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { EventDetail } from "@/api/types";
import {
  Button,
  EmptyState,
  ErrorState,
  GuestDetailsForm,
  HoldCountdownBanner,
  Loader,
  LoginPrompt,
  OrderSummary,
  PaymentRecoveryPanel,
  PromoCodeField,
  Screen,
  ScreenHeader,
  StepIndicator,
  Text,
  TicketQuantityRow,
  type CheckoutStepDef,
} from "@/components";
import { useEvent } from "@/hooks/queries/browse";
import { useCheckout } from "@/hooks/useCheckout";
import { useAccountArea, useAuthStore } from "@/store/authStore";
import { theme } from "@/theme";
import { formatPrice, titleCase } from "@/utils/format";
import { normalizeEventSlug } from "@/utils/slug";

const GUEST_STEPS: CheckoutStepDef[] = [
  { key: "tickets", label: "Tickets", icon: "tag" },
  { key: "details", label: "Details", icon: "user" },
  { key: "checkout", label: "Checkout", icon: "credit-card" },
];
const AUTH_STEPS: CheckoutStepDef[] = [
  { key: "tickets", label: "Tickets", icon: "tag" },
  { key: "checkout", label: "Checkout", icon: "credit-card" },
];

/**
 * ~ the web's "Complete Payment" checkout modal (components/Stripe/EventCheckOut.tsx),
 * as a full screen: Tickets → Details (guests) → Checkout, then the success screen.
 * `?guest=1` = checking out without an account (chosen on the event page).
 */
export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ slug: string; guest?: string }>();
  const slug = normalizeEventSlug(params.slug);
  const area = useAccountArea();
  const query = useEvent(slug);
  const { refetch } = query;

  // Fresh availability every time checkout opens (web: refetchEvent before opening).
  useEffect(() => {
    void refetch();
  }, [refetch]);

  const isCustomer = area === "customer";
  const asGuest = !isCustomer && params.guest === "1";

  let body: ReactNode;
  if (!isCustomer && !asGuest) {
    body = (
      <LoginPrompt
        icon="tag"
        title="Log in to buy tickets"
        message="Log in or create an account to buy tickets."
      />
    );
  } else if (query.isPending) {
    body = <Loader />;
  } else if (query.isError || !query.data) {
    body = (
      <ErrorState
        title="Couldn't load this event"
        error={query.error}
        onRetry={() => void refetch()}
      />
    );
  } else if (query.data.price_category !== "paid") {
    body = (
      <EmptyState
        icon="tag"
        title="Tickets aren't sold here"
        message="This event doesn't sell tickets in the app."
      />
    );
  } else {
    return <CheckoutFlow event={query.data} slug={slug} isGuest={asGuest} />;
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScreenHeader title="Complete Payment" />
      {body}
    </Screen>
  );
}

function CheckoutFlow({
  event,
  slug,
  isGuest,
}: {
  event: EventDetail;
  slug: string;
  isGuest: boolean;
}) {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  /** Set before programmatic navigation so the leave-guard lets it through. */
  const exitingRef = useRef(false);

  const exit = useCallback(() => {
    exitingRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/events/[slug]", params: { slug } });
  }, [slug]);

  const checkout = useCheckout({
    event,
    isGuest,
    onExit: exit,
    onPurchased: () => {
      exitingRef.current = true;
      router.replace("/checkout/success");
    },
  });

  // Latest checkout API for the navigation listener / unmount cleanup.
  const checkoutRef = useRef(checkout);
  useEffect(() => {
    checkoutRef.current = checkout;
  });

  // Back = previous step; can't leave mid-payment; leaving releases the hold.
  // (AppState is deliberately ignored — 3-D Secure redirects background the app.)
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (exitingRef.current) return;
        if (checkoutRef.current.goBackStep()) {
          e.preventDefault();
          return;
        }
        checkoutRef.current.releaseActiveHold();
      }),
    [navigation],
  );
  useEffect(() => () => checkoutRef.current.releaseActiveHold(), []);

  const {
    step,
    quantities,
    pricing,
    secondsLeft,
    promoInput,
    promoMessage,
    error,
    busy,
    recovery,
    availability,
    maxPerRequest,
    totalQuantity,
  } = checkout;

  const steps = isGuest ? GUEST_STEPS : AUTH_STEPS;
  const locked = busy === "paying" || busy === "finalizing";

  let footer: ReactNode = null;
  if (step === "tickets") {
    footer = (
      <View style={styles.footer}>
        <Text variant="caption" color="mutedForeground" align="center">
          Maximum {maxPerRequest} tickets per booking.
        </Text>
        <Button
          title="Continue"
          disabled={totalQuantity === 0}
          loading={busy === "pricing" || busy === "holding"}
          onPress={() => void checkout.continueFromTickets()}
        />
      </View>
    );
  } else if (step === "checkout" && pricing) {
    footer = (
      <View style={styles.footer}>
        <Button
          title={`Pay ${formatPrice(pricing.totalToPay)}`}
          icon="lock"
          loadingTitle={busy === "finalizing" ? "Issuing your tickets…" : "Processing…"}
          loading={locked}
          disabled={!!busy || checkout.isPaid}
          onPress={() => void checkout.pay()}
        />
        <Text variant="caption" color="mutedForeground" align="center">
          Secured by Stripe · End-to-end encrypted
        </Text>
      </View>
    );
  }

  return (
    <Screen padded={false} footer={footer}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScreenHeader title="Complete Payment" />
      <View style={styles.body}>
        <Text variant="h3" numberOfLines={2}>
          {titleCase(event.title)}
        </Text>
        {step !== "recovery" && <StepIndicator steps={steps} current={step} />}

        {!!error && step !== "recovery" && (
          <Text variant="bodySm" color="destructive" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        {step === "tickets" && (
          <View>
            {availability.options.length ? (
              availability.options.map((state, i) => (
                <TicketQuantityRow
                  key={state.option._id ?? i}
                  state={state}
                  quantity={state.option._id ? (quantities[state.option._id] ?? 0) : 0}
                  showRemaining={availability.showRemaining}
                  canIncrement={!!state.option._id && checkout.canIncrement(state.option._id)}
                  onIncrement={() =>
                    state.option._id && checkout.changeQuantity(state.option._id, 1)
                  }
                  onDecrement={() =>
                    state.option._id && checkout.changeQuantity(state.option._id, -1)
                  }
                  disabled={!!busy}
                />
              ))
            ) : (
              <Text variant="bodySm" color="mutedForeground">
                Ticket options will be announced soon.
              </Text>
            )}
          </View>
        )}

        {step === "details" && (
          <View style={styles.section}>
            <Text variant="h3">Your details</Text>
            <Text variant="bodySm" color="mutedForeground">
              We&apos;ll email your tickets here.
            </Text>
            <GuestDetailsForm
              initial={checkout.guestInfo}
              submitLabel="Continue to Payment"
              submitting={busy === "holding"}
              onSubmit={(info) => void checkout.continueFromDetails(info)}
            />
          </View>
        )}

        {step === "checkout" && pricing && (
          <View style={styles.section}>
            {secondsLeft !== null && <HoldCountdownBanner secondsLeft={secondsLeft} />}
            <OrderSummary pricing={pricing} />
            <PromoCodeField
              value={promoInput}
              onChangeText={checkout.setPromoInput}
              onApply={() => void checkout.applyPromo()}
              loading={busy === "promo"}
              disabled={!!busy && busy !== "promo"}
              message={promoMessage}
            />
            <Text variant="caption" color="mutedForeground">
              Service and processing fees are non-refundable.
            </Text>
          </View>
        )}

        {step === "recovery" && recovery && (
          <PaymentRecoveryPanel
            recovery={recovery}
            retrying={busy === "finalizing"}
            initialDetails={
              checkout.guestInfo ??
              (user ? { name: user.name, email: user.email, phone: user.phone_number } : null)
            }
            onRetry={(details) => void checkout.retryFinalize(details)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing[5],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8],
  },
  section: { gap: theme.spacing[4] },
  footer: { gap: theme.spacing[2] },
});
