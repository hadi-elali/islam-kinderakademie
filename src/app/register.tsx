import { Href, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AuthCaptcha } from "@/components/auth/auth-captcha";
import { PrivacyChoices } from "@/components/privacy-choices";
import { ConsentCheckbox } from '@/components/consent-checkbox';
import type { PrivacyChoices as Choices } from "@/constants/privacy";
import type { AuthCaptchaHandle } from "@/components/auth/auth-captcha.types";
import {
  AuthField,
  AuthLayout,
  InlineNotice,
} from "@/components/auth/auth-layout";
import { ActionButton, AppText } from "@/components/ui/primitives";
import { Palette, Radius, Space } from "@/constants/design";
import { useAuth } from "@/context/auth-context";
import {
  hCaptchaSiteKey,
  isHCaptchaConfigured,
} from "@/lib/hcaptcha";
import type { PaymentMethod } from "@/types/database";
import { translateAuthError } from "@/utils/auth-errors";
import {
  PASSWORD_REQUIREMENTS_TEXT,
  validatePassword,
} from "@/utils/password";

export default function RegisterScreen() {
  const router = useRouter();
  const captchaRef = useRef<AuthCaptchaHandle>(null);
  const { signUp, isAuthenticated, isConfigured } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [paymentAccepted, setPaymentAccepted] = useState(false);
  const [privacyChoices, setPrivacyChoices] = useState<Choices>({
    guardianConfirmed: false,
    childDataGranted: false,
    recordingGranted: false,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [payerName, setPayerName] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard" as Href);
    }
  }, [isAuthenticated, router]);

  async function submit() {
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Bitte fülle alle Felder aus.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    const passwordValidation = validatePassword(password);

    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (!paymentAccepted) {
      setError(
        "Bitte bestätige, dass du mit dem monatlichen Beitrag von 15,00 € einverstanden bist.",
      );
      return;
    }

    if (!paymentMethod) {
      setError("Bitte wähle eine Zahlungsart aus.");
      return;
    }

    const normalizedPayerName = payerName.trim();

    if (normalizedPayerName.length < 2) {
      setError(
        paymentMethod === "paypal"
          ? "Bitte gib den Namen deines PayPal-Kontos an."
          : "Bitte gib den Namen des Kontoinhabers an.",
      );
      return;
    }

    if (normalizedPayerName.length > 120) {
      setError("Der Name des Zahlungskontos darf höchstens 120 Zeichen haben.");
      return;
    }

    if (!isHCaptchaConfigured) {
      setError("hCaptcha ist noch nicht konfiguriert.");
      return;
    }

    if (!privacyChoices.guardianConfirmed || !privacyChoices.childDataGranted) {
      setError("Bitte bestätige deine Sorgeberechtigung und die ausdrückliche Einwilligung für Kinderprofile und Lernstände.");
      return;
    }

    if (!captchaToken) {
      setError("Bitte bestätige zuerst die hCaptcha-Prüfung.");
      return;
    }

    setSubmitting(true);

    const result = await signUp(
      normalizedName,
      normalizedEmail,
      password,
      {
        paymentMethod,
        paymentAccepted,
        payerName: normalizedPayerName,
      },
      captchaToken,
      privacyChoices,
    );

    captchaRef.current?.reset();

    setSubmitting(false);

    if (result.error) {
      setError(translateAuthError(result.error));
      return;
    }

    if (result.needsEmailConfirmation) {
      setConfirmationSent(true);
    }
  }

  if (confirmationSent) {
    return (
      <AuthLayout
        eyebrow="FAST GESCHAFFT"
        title="E-Mail bestätigen"
        description="Wir haben dir einen Bestätigungslink geschickt. Öffne ihn, bevor du dich anmeldest."
        footer={
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/login" as Href)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText variant="bodyStrong" color={Palette.forest}>
              Zur Anmeldung
            </AppText>
          </Pressable>
        }
      >
        <InlineNotice tone="success">
          Das Konto wurde angelegt. Prüfe bitte auch deinen Spam-Ordner.
        </InlineNotice>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="NEUES FAMILIENKONTO"
      title="Registrieren"
      description="Erstelle ein Konto, um später auf Termine und Lernbereiche zuzugreifen."
      footer={
        <View style={styles.footerRow}>
          <AppText color={Palette.inkSoft}>Schon registriert?</AppText>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/login" as Href)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText variant="bodyStrong" color={Palette.forest}>
              Anmelden
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={styles.form}>
        {!isConfigured && (
          <InlineNotice tone="info">
            Supabase ist noch nicht verbunden. Trage zuerst URL und Publishable
            Key in deiner `.env`-Datei ein.
          </InlineNotice>
        )}

        {!isHCaptchaConfigured && (
          <InlineNotice tone="info">
            hCaptcha ist noch nicht konfiguriert. Hinterlege den öffentlichen
            Sitekey, bevor Registrierungen freigeschaltet werden.
          </InlineNotice>
        )}

        {error && <InlineNotice>{error}</InlineNotice>}

        <AuthField
          label="Name"
          placeholder="Dein Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />

        <AuthField
          label="E-Mail-Adresse"
          placeholder="name@beispiel.de"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <AuthField
          label="Passwort"
          placeholder="Mindestens 12 Zeichen"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />

        <AppText variant="small" color={Palette.muted}>
          {PASSWORD_REQUIREMENTS_TEXT}
        </AppText>

        <AuthField
          label="Passwort wiederholen"
          placeholder="Passwort erneut eingeben"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
        />

        {/* Monatsbeitrag */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <AppText variant="bodyStrong">Monatsbeitrag</AppText>

            <AppText variant="heading" color={Palette.forest}>
              15,00 €
            </AppText>
          </View>

          <AppText variant="small" color={Palette.inkSoft}>
            Der Beitrag beträgt 15,00 € pro Monat.
          </AppText>

          {/* Zahlungsart */}
          <View style={styles.paymentMethods}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                selected: paymentMethod === "paypal",
              }}
              onPress={() => setPaymentMethod("paypal")}
              style={({ pressed }) => [
                styles.paymentOption,
                paymentMethod === "paypal" && styles.paymentOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === "paypal" && styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === "paypal" && (
                  <View style={styles.radioInner} />
                )}
              </View>

              <View style={styles.paymentOptionText}>
                <AppText variant="bodyStrong">PayPal</AppText>
                <AppText variant="small" color={Palette.muted}>
                  Monatliche Zahlung über PayPal
                </AppText>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                selected: paymentMethod === "bank_transfer",
              }}
              onPress={() => setPaymentMethod("bank_transfer")}
              style={({ pressed }) => [
                styles.paymentOption,
                paymentMethod === "bank_transfer" &&
                  styles.paymentOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === "bank_transfer" &&
                    styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === "bank_transfer" && (
                  <View style={styles.radioInner} />
                )}
              </View>

              <View style={styles.paymentOptionText}>
                <AppText variant="bodyStrong">Banküberweisung</AppText>
                <AppText variant="small" color={Palette.muted}>
                  Monatliche Zahlung per Banküberweisung
                </AppText>
              </View>
            </Pressable>
          </View>

          {paymentMethod && (
            <View style={styles.payerNameField}>
              <AuthField
                label={
                  paymentMethod === "paypal"
                    ? "Name im PayPal-Konto"
                    : "Name des Kontoinhabers"
                }
                placeholder={
                  paymentMethod === "paypal"
                    ? "Name, unter dem du bei PayPal zahlst"
                    : "Name, von dessen Konto du überweist"
                }
                value={payerName}
                onChangeText={setPayerName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={120}
                returnKeyType="done"
              />

              <AppText variant="small" color={Palette.muted}>
                So kann das Akademie-Team deine monatliche Zahlung eindeutig
                zuordnen. Bitte gib keine IBAN oder Kontonummer ein.
              </AppText>
            </View>
          )}

          <ConsentCheckbox
            label="Ich stimme dem monatlichen Beitrag von 15,00 € zu und zahle über die gewählte Zahlungsart."
            checked={paymentAccepted}
            disabled={submitting}
            onChange={() => setPaymentAccepted((current) => !current)}
          />
        </View>

        <PrivacyChoices value={privacyChoices} onChange={setPrivacyChoices} disabled={submitting} />

        {isHCaptchaConfigured && (
          <AuthCaptcha
            ref={captchaRef}
            siteKey={hCaptchaSiteKey}
            verified={Boolean(captchaToken)}
            disabled={submitting}
            onTokenChange={setCaptchaToken}
            onError={setError}
          />
        )}

        <ActionButton
          label={submitting ? "Konto wird erstellt …" : "Konto erstellen"}
          icon="arrow"
          disabled={
            submitting ||
            !isConfigured ||
            !paymentAccepted ||
            !paymentMethod ||
            !privacyChoices.childDataGranted ||
            !privacyChoices.guardianConfirmed ||
            payerName.trim().length < 2 ||
            !isHCaptchaConfigured ||
            !captchaToken
          }
          onPress={() => void submit()}
          style={styles.submitButton}
        />

        <AppText variant="small" color={Palette.muted} style={styles.legalCopy}>
          Mit der Registrierung wird dein geschützter Akademie-Account angelegt.
        </AppText>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },

  submitButton: {
    width: "100%",
    marginTop: Space.sm,
  },

  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },

  legalCopy: {
    textAlign: "center",
  },

  pressed: {
    opacity: 0.7,
  },

  paymentSection: {
    gap: Space.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.medium,
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },

  paymentMethods: {
    gap: Space.sm,
    marginTop: Space.sm,
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.medium,
  },

  paymentOptionSelected: {
    borderColor: Palette.forest,
  },

  paymentOptionText: {
    flex: 1,
    gap: 2,
  },

  payerNameField: {
    gap: Space.xs,
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.muted,
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: Palette.forest,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.forest,
  },

});
