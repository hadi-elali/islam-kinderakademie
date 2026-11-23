import { useSyncExternalStore } from 'react';

import { PRIVACY_VERSION } from '@/constants/privacy';

// Deliberately memory-only: reloading the page or restarting the app asks again.
// No identifier or decision is written to cookies or browser storage.
type CaptchaConsent = { version: string; grantedAt: string };
let consent: CaptchaConsent | null = null;
const listeners = new Set<() => void>();

export function getCaptchaConsent() {
  return consent;
}

export function grantCaptchaConsent() {
  consent = { version: PRIVACY_VERSION, grantedAt: new Date().toISOString() };
  listeners.forEach((listener) => listener());
}

export function clearCaptchaConsent() {
  consent = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useCaptchaConsent() {
  return useSyncExternalStore(subscribe, getCaptchaConsent, () => null);
}
