/**
 * WHICH JAVA THE ANDROID BUILD CAN RUN ON, said before Gradle is started.
 *
 * The native project is Capacitor 8's, which builds with Gradle 8.14. Gradle 8.14 runs on Java 21
 * to 24, and Capacitor's own code needs 21. On anything newer the build dies with "Unsupported
 * class file major version 69", which names nothing a person can act on: found on 2 October 2026,
 * on the Java 25 that Android Studio 2026.2 brings with it. So the version is read first and the
 * refusal says what to do.
 *
 * Raise `NEWEST` when the Gradle in `android/gradle/wrapper/gradle-wrapper.properties` is raised.
 */
export const OLDEST = 21;
export const NEWEST = 24;

/** The major version in what `java -version` prints, or null if it is not there. */
export function javaMajor(versionOutput: string): number | null {
  const quoted = /version "(\d+)(?:\.(\d+))?/.exec(versionOutput);
  if (!quoted) return null;
  const first = Number(quoted[1]);
  // Java 8 and older called themselves 1.8, 1.7.
  return first === 1 ? Number(quoted[2] ?? 0) : first;
}

export function javaVerdict(versionOutput: string): { usable: boolean; why: string } {
  const major = javaMajor(versionOutput);
  if (major === null) {
    return { usable: false, why: 'JAVA_HOME does not name a Java: `java -version` said nothing.' };
  }
  if (major < OLDEST || major > NEWEST) {
    return {
      usable: false,
      why:
        `JAVA_HOME is Java ${String(major)}. The Android build needs Java ${String(OLDEST)} to ` +
        `${String(NEWEST)}: point JAVA_HOME at a Java ${String(OLDEST)} (packages/android/README.md).`,
    };
  }
  return { usable: true, why: `Java ${String(major)}` };
}
