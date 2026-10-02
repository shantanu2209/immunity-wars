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
itself. The build for the store, with a key of its own, is a later piece.

## What the shell's web build leaves out

`vite build --mode android` (in `packages/app`) is the web build without:

- **the service worker.** Every file is inside the app, so there is nothing for it to store, and a
  newer version comes from the store and not from the game's server;
- **the developer's pages,** except the measuring page (`measure.html`), which is how the frame
  rate is read inside the shell. It comes out too when a build is made for the store.

`packages/app/src/shell-build.test.ts` builds it and holds it to that.
