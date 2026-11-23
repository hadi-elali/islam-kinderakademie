import { HCaptcha as HCaptchaWidget } from "@hcaptcha/react-hcaptcha";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";

import type {
  AuthCaptchaHandle,
  AuthCaptchaProps,
} from "@/components/auth/auth-captcha.types";
import { CaptchaPrivacyGate } from '@/components/auth/captcha-privacy';

export const AuthCaptcha = forwardRef<AuthCaptchaHandle, AuthCaptchaProps>(
  function AuthCaptcha(
    { siteKey, disabled, onTokenChange, onError },
    forwardedRef,
  ) {
    const captchaRef = useRef<HCaptchaWidget>(null);

    useImperativeHandle(
      forwardedRef,
      () => ({
        reset() {
          captchaRef.current?.resetCaptcha();
          onTokenChange(null);
        },
      }),
      [onTokenChange],
    );

    return (
      <CaptchaPrivacyGate disabled={disabled}>
      <View
        aria-disabled={disabled || undefined}
        pointerEvents={disabled ? "none" : "auto"}
        style={[styles.container, disabled && styles.disabled]}
      >
        <HCaptchaWidget
          ref={captchaRef}
          sitekey={siteKey}
          languageOverride="de"
          theme="light"
          onVerify={(token) => onTokenChange(token)}
          onExpire={() => onTokenChange(null)}
          onChalExpired={() => onTokenChange(null)}
          onError={() => {
            onTokenChange(null);
            onError(
              "hCaptcha konnte nicht geladen werden. Bitte versuche es erneut.",
            );
          }}
        />
      </View>
      </CaptchaPrivacyGate>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    minHeight: 78,
  },
  disabled: {
    opacity: 0.55,
  },
});
