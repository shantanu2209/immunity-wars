/**
 * BUILDS THE APP FOR THE STORE (ruled 3 October 2026; docs/LOOK_PLAN.md §26).
 *
 *   pnpm android:bundle     the store's build of the web app, copied in, and a signed release bundle
 *
 * Run by the person who holds the upload key, in their own terminal, because it asks for the key's
 * password and shows nothing as it is typed. The password goes to Gradle for this one build and is
 * kept nowhere. Nothing here prints it, and nothing here can be run without a terminal to ask in.
 *
 * WHAT IT REFUSES, each before Gradle starts:
 *   - a working folder with changes: what goes to the store must be a commit, so that the version
 *     About shows can be found again;
 *   - no `IW_UPLOAD_KEYSTORE`, or no file there: the upload key is named by the environment, never
 *     by this repository (`packages/android/README.md` says how it was made);
 *   - a Java the build cannot run on, as `apk.ts` does.
 * And after Gradle, a bundle that is not signed.
 *
 * WHAT GOES IN: the web app built for the store (`IW_STORE_BUILD=1`: no page of a developer's), with
 * the version About shows, `android-<name>-<code>-<commit>`, read from the native project.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { javaVerdict } from './src/java.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const NATIVE = join(HERE, 'android');
const GRADLE_APP = join(NATIVE, 'app', 'build.gradle');
const BUNDLE = join(NATIVE, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');

function stop(why: string): never {
  console.error(`\nSTOPPED: ${why}`);
  process.exit(1);
}

/** Asks in the terminal and shows nothing as it is typed. */
function askHidden(question: string): Promise<string> {
  return new Promise((done, fail) => {
    const input = process.stdin;
    if (!input.isTTY) {
      fail(new Error('there is no terminal to ask in'));
      return;
    }
    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');
    let typed = '';
    const finish = (then: () => void): void => {
      input.setRawMode(false);
      input.pause();
      input.off('data', onKey);
      process.stdout.write('\n');
      then();
    };
    const onKey = (keys: string): void => {
      for (const key of keys) {
        if (key === '\r' || key === '\n') return finish(() => done(typed));
        if (key === '\u0003') return finish(() => fail(new Error('cancelled')));
        if (key === '\u007f' || key === '\b') typed = typed.slice(0, -1);
        else typed += key;
      }
    };
    input.on('data', onKey);
  });
}

// What goes to the store is a commit.
if (execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim() !== '') {
  stop('the working folder has changes. Commit them, or set them aside, and build again.');
}

const javaHome = process.env['JAVA_HOME'];
if (javaHome === undefined || javaHome === '') stop('JAVA_HOME is not set.');
if (process.env['ANDROID_HOME'] === undefined) stop('ANDROID_HOME is not set.');
const java = join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
if (!existsSync(java)) stop(`JAVA_HOME has no bin/java: ${javaHome}`);
const asked = spawnSync(java, ['-version'], { encoding: 'utf8' });
const verdict = javaVerdict(`${asked.stdout}\n${asked.stderr}`);
if (!verdict.usable) stop(verdict.why);

const keystore = process.env['IW_UPLOAD_KEYSTORE'];
if (keystore === undefined || keystore === '')
  stop('IW_UPLOAD_KEYSTORE is not set: it names the upload key (packages/android/README.md).');
if (!existsSync(keystore)) stop('there is no upload key where IW_UPLOAD_KEYSTORE says.');

// The version, as the native project gives it.
const gradle = readFileSync(GRADLE_APP, 'utf8');
const code = /versionCode\s+(\d+)/.exec(gradle)?.[1];
const name = /versionName\s+"([^"]+)"/.exec(gradle)?.[1];
if (code === undefined || name === undefined) stop('the native project names no version.');
const commit = execSync('git rev-parse --short HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
const version = `android-${name}-${code}-${commit}`;
console.log(`Java: ${verdict.why}. Building version ${name} (code ${code}), ${version}.`);

let password = process.env['IW_UPLOAD_PASSWORD'] ?? '';
if (password === '') {
  try {
    password = await askHidden('The upload key’s password (nothing shows as you type): ');
  } catch (e) {
    stop(`no password: ${e instanceof Error ? e.message : String(e)}.`);
  }
}
if (password === '') stop('no password was typed.');

const env = {
  ...process.env,
  VITE_APP_VERSION: version,
  IW_STORE_BUILD: '1',
  IW_UPLOAD_KEYSTORE: keystore,
  IW_UPLOAD_PASSWORD: password,
};
const run = (command: string, cwd: string): void => {
  execSync(command, { cwd, stdio: 'inherit', env });
};

run(
  'pnpm --filter @immunity-wars/app exec vite build --mode android --emptyOutDir --outDir ../android/www',
  REPO,
);
run('pnpm exec cap sync android', HERE);
const gradlew = join(NATIVE, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
run(`"${gradlew}" bundleRelease --console=plain`, NATIVE);

if (!existsSync(BUNDLE)) stop('Gradle finished and wrote no bundle.');
// Signed, and by which key: the certificate's fingerprint is what Play shows for the upload key.
const keytool = join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
const cert = spawnSync(keytool, ['-printcert', '-jarfile', BUNDLE], { encoding: 'utf8' });
const sha256 = /SHA256:\s*([0-9A-F:]+)/.exec(cert.stdout)?.[1];
if (sha256 === undefined) stop(`the bundle is not signed: ${BUNDLE}`);
console.log(
  `\nBuilt for the store: ${(statSync(BUNDLE).size / (1024 * 1024)).toFixed(1)} MB, version ${name} (code ${code}).\n` +
    `  ${BUNDLE}\n` +
    `  signed by the upload key, SHA-256 ${sha256}\n` +
    'Upload it to the closed testing track in Play Console. The next build for the store needs the\n' +
    'version code raised by one first, in packages/android/android/app/build.gradle.',
);
