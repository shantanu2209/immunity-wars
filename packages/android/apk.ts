/**
 * BUILDS THE ANDROID APP, AND PUTS IT ON A CONNECTED PHONE IF ASKED.
 *
 *   pnpm android:apk             # the app's web build for the shell, copied in, and a debug app
 *   pnpm android:apk --install   # the same, then installed on the phone on the cable and opened
 *
 * A DEBUG build: signed with the key every Android SDK makes for itself, installable on a phone
 * with USB debugging on, and not something a store accepts. The build for the store is a later
 * piece, with a key of its own.
 *
 * WHERE THE TOOLS ARE IS THIS MACHINE'S BUSINESS, NOT THE REPOSITORY'S: `JAVA_HOME` names a Java
 * 21 and `ANDROID_HOME` the Android SDK (packages/android/README.md). Nothing here names a path.
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { javaVerdict } from './src/java.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const NATIVE = join(HERE, 'android');
const APK = join(NATIVE, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const APP_ID = 'com.kartikchaudhary.immunitywars';

function stop(why: string): never {
  console.error(`\nNOT BUILT: ${why}`);
  process.exit(1);
}

const javaHome = process.env['JAVA_HOME'];
const sdk = process.env['ANDROID_HOME'];
if (javaHome === undefined || javaHome === '') stop('JAVA_HOME is not set.');
if (sdk === undefined || sdk === '') stop('ANDROID_HOME is not set.');
const exe = process.platform === 'win32' ? '.exe' : '';
const java = join(javaHome, 'bin', `java${exe}`);
if (!existsSync(java)) stop(`JAVA_HOME has no bin/java: ${javaHome}`);

// `java -version` prints to stderr, so both streams are read.
const asked = spawnSync(java, ['-version'], { encoding: 'utf8' });
const verdict = javaVerdict(`${asked.stdout}\n${asked.stderr}`);
if (!verdict.usable) stop(verdict.why);
console.log(`Java: ${verdict.why}. SDK: ANDROID_HOME.`);

const run = (command: string, cwd: string): void => {
  execSync(command, { cwd, stdio: 'inherit', env: process.env });
};

// The app's web build, made for the shell, into www/; then copied into the native project.
run(
  'pnpm --filter @immunity-wars/app exec vite build --mode android --emptyOutDir --outDir ../android/www',
  REPO,
);
run('pnpm exec cap sync android', HERE);

// By its whole path: a Windows shell does not always look in the folder it is started in, and
// this one did not ("'gradlew.bat' is not recognized", 2 October 2026).
const gradlew = join(NATIVE, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}" assembleDebug --console=plain`, NATIVE);

if (!existsSync(APK)) stop('Gradle finished and wrote no app.');
console.log(`\nBuilt: ${(statSync(APK).size / (1024 * 1024)).toFixed(1)} MB, a debug build.`);

if (process.argv.includes('--install')) {
  const adb = join(sdk, 'platform-tools', `adb${exe}`);
  const devices = execFileSync(adb, ['devices'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .filter((line) => /\tdevice\s*$/.test(line));
  if (devices.length !== 1) {
    stop(
      `${String(devices.length)} phones are connected and allowed; one is needed. ` +
        'USB debugging must be on, and this computer allowed on the phone.',
    );
  }
  execFileSync(adb, ['install', '-r', APK], { stdio: 'inherit' });
  execFileSync(adb, ['shell', 'am', 'start', '-n', `${APP_ID}/.MainActivity`], {
    stdio: 'inherit',
  });
  console.log('Installed and opened.');
}
