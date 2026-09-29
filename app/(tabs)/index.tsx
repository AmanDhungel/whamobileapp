import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, RefreshControl, StyleSheet, View } from "react-native";

import {
  BusinessCard,
  Button,
  Card,
  CardSkeleton,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  EventCard,
  HorizontalCarousel,
  Screen,
  SectionHeader,
  SelectField,
  SelectSheet,
  Text,
  TextInput,
  TextLink,
} from "@/components";
import { useLanding } from "@/hooks/queries/browse";
import { useAccountArea } from "@/store/authStore";
import { useCityStore } from "@/store/cityStore";
import { theme, useTheme } from "@/theme";
import { AU_CITIES, EMPLOYEE_CATEGORIES, SOCIAL_LINKS, type AuCity } from "@/utils/catalog";
import { WEBSITE_URL, legalLinks, openInAppBrowser } from "@/utils/links";

type CityChoice = AuCity | "all";
const CITY_OPTIONS = [
  { label: "All of Australia", value: "all" as CityChoice, icon: "globe" as const },
  ...AU_CITIES.map((c) => ({ label: c, value: c as CityChoice, icon: "map-pin" as const })),
];

/**
 * ~ web / (components/LandingPage/LandingPage.tsx), same section order:
 * Hero + search → Upcoming Events → Businesses → WHA for business → Browse by City →
 * Footer. (The web's hardcoded promo banner is intentionally omitted until it comes
 * from the API.)
 */
export default function HomeScreen() {
  const t = useTheme();
  const area = useAccountArea();
  const { city, setCity } = useCityStore();
  const landing = useLanding(city);
  const [citySheet, setCitySheet] = useState(false);
  const [what, setWhat] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const cityLabel = city ?? "Australia";
  const cityChoice: CityChoice = city ?? "all";
  const events = landing.data?.upcomingevents ?? [];
  const businesses = landing.data?.business ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await landing.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const goSearch = (params: { tab?: string; q?: string; category?: string; city?: string }) =>
    router.navigate({
      pathname: "/search",
      params: { tab: "services", city: city ?? "", ...params },
    });

  return (
    <Screen
      edges={["top"]}
      padded={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={t.colors.primary}
        />
      }
    >
      {/* Header: logo · city · log in */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="WH Australia"
        />
        <View style={styles.headerActions}>
          <Chip
            label={city ?? "Australia"}
            icon="map-pin"
            dropdown
            onPress={() => setCitySheet(true)}
          />
          {area === "public" && (
            <Button
              title="Log in"
              size="sm"
              fullWidth={false}
              onPress={() => router.push("/welcome")}
            />
          )}
        </View>
      </View>

      {/* S1 Hero + search */}
      <View style={styles.section}>
        <Text variant="h1">What&apos;s Happening Australia</Text>
        <Text variant="bodySm" color="mutedForeground">
          Discover trusted local businesses, professional services, and upcoming events across
          Australia all in one place.
        </Text>
        <Card style={styles.searchCard}>
          <TextInput
            label="What"
            placeholder="All Services"
            value={what}
            onChangeText={setWhat}
            returnKeyType="search"
            onSubmitEditing={() => goSearch({ q: what.trim() })}
            prefix={
              <Feather
                name="search"
                size={t.sizes.iconMd}
                color={t.colors.mutedForeground}
                style={styles.prefixIcon}
              />
            }
          />
          <View style={styles.where}>
            <Text variant="label">Where</Text>
            <SelectField
              title="Where"
              options={CITY_OPTIONS}
              value={cityChoice}
              onChange={(v) => setCity(v === "all" ? null : v)}
            />
          </View>
          <Button title="Search" icon="search" onPress={() => goSearch({ q: what.trim() })} />
        </Card>
      </View>

      {landing.isError && !landing.data ? (
        <ErrorState
          title="Couldn't load what's happening"
          error={landing.error}
          onRetry={() => void onRefresh()}
          retrying={refreshing}
        />
      ) : (
        <>
          {/* S3 Upcoming events (hidden when empty, like the web) */}
          {(landing.isPending || events.length > 0) && (
            <View style={styles.block}>
              <SectionHeader
                title="Upcoming Events"
                style={styles.sectionHeader}
                onAction={() => router.push("/events")}
              />
              <HorizontalCarousel
                data={events}
                keyExtractor={(e) => e._id}
                loading={landing.isPending}
                renderSkeleton={(w) => <CardSkeleton variant="event" width={w} />}
                renderItem={(e, w) => <EventCard event={e} width={w} />}
              />
            </View>
          )}

          {/* S4 Businesses */}
          {(landing.isPending || businesses.length > 0) && (
            <View style={styles.block}>
              <SectionHeader
                title={`Businesses in ${cityLabel}`}
                style={styles.sectionHeader}
                onAction={() => goSearch({ tab: "services" })}
              />
              <HorizontalCarousel
                data={businesses}
                keyExtractor={(b) => b._id}
                loading={landing.isPending}
                renderSkeleton={(w) => <CardSkeleton variant="business" width={w} />}
                renderItem={(b, w) => <BusinessCard business={b} width={w} />}
              />
            </View>
          )}

          {!landing.isPending && events.length === 0 && businesses.length === 0 && (
            <EmptyState
              icon="map"
              title={`Nothing listed in ${cityLabel} yet`}
              message="Try another city, or browse all of Australia."
              action={
                city ? (
                  <Button
                    title="Show all of Australia"
                    variant="outline"
                    onPress={() => setCity(null)}
                  />
                ) : undefined
              }
            />
          )}
        </>
      )}

      {/* S5 WHA for business (static copy from the web) */}
      <View style={styles.section}>
        <Card style={styles.businessCard}>
          <Text variant="h2">WHA for business</Text>
          <Text variant="bodySm" color="mutedForeground">
            Grow your business with WHA — Australia&apos;s community platform for discovering and
            promoting local businesses, services, and events. Reach new customers, showcase your
            services, and connect with the all community across Australia.
          </Text>
          <Button
            title="List your business"
            icon="arrow-right"
            onPress={() =>
              area === "public"
                ? router.push("/business-signup")
                : void openInAppBrowser(`${WEBSITE_URL}/auth`)
            }
          />
        </Card>
      </View>

      {/* S6 Browse by City + services */}
      <View style={styles.block}>
        <SectionHeader title="Browse by City" style={styles.sectionHeader} />
        <ChipRow>
          {AU_CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={city === c}
              onPress={() => {
                setCity(c);
                goSearch({ tab: "services", city: c });
              }}
            />
          ))}
        </ChipRow>
        <ChipRow style={styles.chipRowGap}>
          {EMPLOYEE_CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              icon={c.icon}
              onPress={() => goSearch({ tab: "services", category: c.value })}
            />
          ))}
        </ChipRow>
      </View>

      {/* S7 Footer */}
      <View style={[styles.footer, { borderTopColor: t.colors.border }]}>
        <Text variant="h3">
          wha
          <Text variant="h3" color="secondary">
            .
          </Text>
        </Text>
        <View style={styles.footerLinks}>
          <TextLink onPress={() => void openInAppBrowser(legalLinks.privacy)}>
            Privacy Policy
          </TextLink>
          <TextLink onPress={() => void openInAppBrowser(legalLinks.termsOfBusiness)}>
            Terms and Conditions
          </TextLink>
          <TextLink onPress={() => void openInAppBrowser(legalLinks.termsOfService)}>
            Terms of Service
          </TextLink>
        </View>
        <View style={styles.social}>
          <Button
            variant="outline"
            size="icon"
            icon="instagram"
            accessibilityLabel="Instagram"
            onPress={() => void Linking.openURL(SOCIAL_LINKS.instagram)}
          />
          <Button
            variant="outline"
            size="icon"
            icon="facebook"
            accessibilityLabel="Facebook"
            onPress={() => void Linking.openURL(SOCIAL_LINKS.facebook)}
          />
          <Button
            variant="outline"
            size="icon"
            icon="mail"
            accessibilityLabel="Email us"
            onPress={() => void Linking.openURL(SOCIAL_LINKS.email)}
          />
        </View>
        <Text variant="caption" color="mutedForeground">
          English (AU) · © 2026 WHA Inc.
        </Text>
      </View>

      <SelectSheet
        visible={citySheet}
        onClose={() => setCitySheet(false)}
        title="Choose your city"
        options={CITY_OPTIONS}
        value={cityChoice}
        onSelect={(v) => setCity(v === "all" ? null : v)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3],
  },
  logo: { width: theme.sizes.logoWidth, height: theme.sizes.logoHeight },
  headerActions: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  section: {
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    marginTop: theme.spacing[4],
  },
  searchCard: { gap: theme.spacing[4], marginTop: theme.spacing[2] },
  prefixIcon: { marginRight: theme.spacing[2] },
  where: { gap: theme.spacing[1.5] },
  block: { gap: theme.spacing[4], marginTop: theme.spacing[8] },
  sectionHeader: { paddingHorizontal: theme.spacing[6] },
  businessCard: { gap: theme.spacing[4], marginTop: theme.spacing[4] },
  chipRowGap: { marginTop: theme.spacing[1] },
  footer: {
    gap: theme.spacing[4],
    marginTop: theme.spacing[10],
    paddingTop: theme.spacing[6],
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8],
    borderTopWidth: theme.sizes.hairline,
  },
  footerLinks: { gap: theme.spacing[3] },
  social: { flexDirection: "row", gap: theme.spacing[3] },
});
