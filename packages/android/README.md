# The Android shell

The Android app is the same web app inside a [Capacitor](https://capacitorjs.com/) shell, with the
whole game bundled in it so that it plays with no connection. Ruled 2 October 2026
([`docs/LOOK_PLAN.md`](../../docs/LOOK_PLAN.md) §26). Nothing here changes the game: the rules are
the engine's, the screens are `packages/ui`'s, and this package wraps what `packages/app` builds.

## What is here

| | |
|---|---|
| `capacitor.config.ts` | The app's id and name, both ruled, and the colour behind the system's bars |
| `android/` | The native project Capacitor generated. Committed. Changed from the template in the few places `AndroidManifest.xml` says, and in its launch screen |
| `www/` | The app's web build made for the shell. Built by `pnpm android:web`, never committed |
| `apk.ts` | Builds the app, and installs it on a connected phone |
| `src/` | The tests that hold the native project to what was ruled, and the Java check |

## Building it

Two things on the machine, named by two variables. No path is written in this repository.

| Variable | Names | Where it comes from |
|---|---|---|
| `JAVA_HOME` | **A Java 21.** Not the Java 25 that Android Studio 2026.2 brings: Capacitor 8 builds with Gradle 8.14, which runs on Java 21 to 24 | Any JDK 21, for example Eclipse Temurin |
| `ANDROID_HOME` | The Android SDK | Android Studio installs it |

```bash
pnpm android:apk
```

```bash
pnpm android:apk --install
```

The first builds a debug app. The second also puts it on the one phone connected by USB with USB
debugging on, and opens it.

**A debug build is not a store build.** It is signed with the key every Android SDK makes for
itself. The build for the store is below.

## What the shell's web build leaves out

`vite build --mode android` (in `packages/app`) is the web build without:

- **the service worker.** Every file is inside the app, so there is nothing for it to store, and a
  newer version comes from the store and not from the game's server;
- **the developer's pages,** except the measuring page (`measure.html`), which is how the frame
  rate is read inside the shell. It comes out too when a build is made for the store
  (`IW_STORE_BUILD=1`, which `pnpm android:bundle` sets).

`packages/app/src/shell-build.test.ts` builds it and holds it to that.

## Building it for the store

Ruled 3 October 2026 (`docs/LOOK_PLAN.md` §26). **Only the person who holds the upload key can do
this, in their own terminal.** The key and its password never go into this repository, which is
public.

**The upload key, made once.** With Java 21's `keytool`, into a folder outside the repository:

```
keytool -genkeypair -v -keystore <folder>/upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000 -storetype PKCS12 -dname "CN=Immunity Wars"
```

It asks for a password twice. Keep the password in a password manager, and a copy of `upload.jks`
somewhere other than that computer. Google Play re-signs the app with its own key (Play App
Signing), so this key only proves who uploads; if it is ever lost, Google can register a new one.

**Each build for the store:**

1. Raise `versionCode` by one in `android/app/build.gradle` (the store refuses a code it has
   seen), and commit: the build refuses a working folder with changes.
2. Set `IW_UPLOAD_KEYSTORE` to the key's path, as well as `JAVA_HOME` and `ANDROID_HOME`.
3. `pnpm android:bundle`. It asks for the key's password and shows nothing as it is typed, builds
   the web app for the store (no page of a developer's), and writes a signed release bundle,
   `android/app/build/outputs/bundle/release/app-release.aab`. It prints the upload key's SHA-256,
   which Play Console shows too.

`packages/android/src/shell.test.ts` holds that the signing block names no key and no password,
and that no key file is in the repository.
