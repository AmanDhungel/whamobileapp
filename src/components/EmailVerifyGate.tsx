import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { normalizeEmail } from "@/api/auth";
import { useSendSignupCode, useVerifySignupCode } from "@/hooks/useAuthActions";
import { useCountdown } from "@/hooks/useCountdown";
import { theme, useTheme } from "@/theme";
import { EMAIL_RE } from "@/utils/validation";

import { Button } from "./Button";
import { CodeInput } from "./CodeInput";
import { Text } from "./Text";

const RESEND_COOLDOWN_S = 60;
const CODE_LENGTH = 6;

export interface EmailVerifyGateProps {
  /** The email as typed (normalised internally). */
  email: string;
  /** The email that has been verified, if any. */
  verifiedEmail: string | null;
  onVerified: (email: string) => void;
}

/**
 * Pre-signup email verification (web components/Auth/EmailVerifyGate.tsx), shown
 * under the email field: "Verify this email" → 6-digit code + Confirm / Resend (60 s
 * cooldown) → "Email verified". Changing the email afterwards requires re-verifying.
 * Renders nothing until the email looks valid.
 */
export function EmailVerifyGate({
  email: rawEmail,
  verifiedEmail,
  onVerified,
}: EmailVerifyGateProps) {
  const t = useTheme();
  const sendCode = useSendSignupCode();
  const verifyCode = useVerifySignupCode();
  const cooldown = useCountdown();
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const email = normalizeEmail(rawEmail);
  if (!EMAIL_RE.test(email)) return null;

  if (verifiedEmail === email) {
    return (
      <View style={styles.verifiedRow} accessibilityLiveRegion="polite">
        <Feather name="check-circle" size={t.sizes.iconSm} color={t.colors.success} />
        <Text variant="captionMedium" color="success">
          Email verified
        </Text>
      </View>
    );
  }

  const send = () =>
    sendCode.mutate(email, {
      onSuccess: () => {
        setCodeSentTo(email);
        setCode("");
        cooldown.start(RESEND_COOLDOWN_S);
      },
    });

  const verify = (value = code) => {
    if (value.length !== CODE_LENGTH || verifyCode.isPending) return;
    verifyCode.mutate({ email, code: value }, { onSuccess: () => onVerified(email) });
  };

  if (codeSentTo !== email) {
    return (
      <Button
        title="Verify this email"
        variant="secondary"
        size="sm"
        loading={sendCode.isPending}
        onPress={send}
      />
    );
  }

  return (
    <View style={styles.codeBlock}>
      <Text variant="caption" color="mutedForeground">
        Enter the 6-digit code sent to <Text variant="captionMedium">{email}</Text>
      </Text>
      <CodeInput
        value={code}
        onChange={setCode}
        length={CODE_LENGTH}
        autoFocus
        editable={!verifyCode.isPending}
        onComplete={verify}
      />
      <View style={styles.codeActions}>
        <Button
          title="Confirm"
          size="sm"
          fullWidth={false}
          style={styles.flex}
          disabled={code.length !== CODE_LENGTH}
          loading={verifyCode.isPending}
          onPress={() => verify()}
        />
        <Button
          title={cooldown.active ? `Resend in ${cooldown.seconds}s` : "Resend"}
          size="sm"
          variant="ghost"
          fullWidth={false}
          style={styles.flex}
          disabled={cooldown.active}
          loading={sendCode.isPending}
          onPress={send}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1.5] },
  codeBlock: { gap: theme.spacing[3] },
  codeActions: { flexDirection: "row", gap: theme.spacing[3] },
  flex: { flex: 1 },
});
