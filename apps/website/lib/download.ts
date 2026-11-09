/**
 * Where "Download the app" points. Set NEXT_PUBLIC_APK_URL at build time;
 * by default it is the APK attached to the repository's latest GitHub release
 * (published by .github/workflows/mobile-apk.yml).
 */
export const APK_URL =
  process.env.NEXT_PUBLIC_APK_URL ??
  'https://github.com/silentknight-sudo/tirthnow_fullstack/releases/latest/download/tirthnow.apk';

/** Store pages; empty until the listings are live. */
export const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_URL ?? '';
export const APPSTORE_URL = process.env.NEXT_PUBLIC_APPSTORE_URL ?? '';
