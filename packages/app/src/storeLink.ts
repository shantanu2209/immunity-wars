/**
 * THE GAME'S PAGE ON GOOGLE PLAY, where the Android app's updates come from (`docs/LOOK_PLAN.md`
 * §28, step 4). The Android app opens it when the game's server refuses this version, and when a
 * newer version saved the game on the phone. Capacitor hands a link to another site to Android,
 * which opens it in Google Play.
 *
 * The id in it is the app's ruled id, written in the Android project too; the shell's test holds
 * them to one id (`packages/android/src/shell.test.ts`, control android-id-is-one-id).
 */
export const STORE_LINK =
  'https://play.google.com/store/apps/details?id=com.kartikchaudhary.immunitywars';
