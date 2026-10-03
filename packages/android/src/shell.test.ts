/**
 * THE SHELL IS WHAT WAS RULED (docs/LOOK_PLAN.md §26). The Android project is generated once and
 * then lives as files of its own, in Gradle and XML, where nothing else in this repository looks.
 * A handful of its values are rulings or follow from one, and each is written in more than one
 * file. They are held together here, read from the files themselves.
 *
 * Controls: pnpm ci:selftest android-id-is-one-id, android-keeps-no-backup,
 * android-ground-is-the-kits-table, android-text-is-the-games-size, android-no-key-in-the-repository.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COLOUR } from '@immunity-wars/ui/kit';
import { describe, expect, it } from 'vitest';

import config from '../capacitor.config.js';

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(HERE, path), 'utf8');

const MAIN = 'android/app/src/main';
const manifest = read(`${MAIN}/AndroidManifest.xml`);
const gradle = read('android/app/build.gradle');
const strings = read(`${MAIN}/res/values/strings.xml`);

/** Ruled by Shantanu, 2 October 2026. The id is permanent once the app is published. */
const RULED_ID = 'com.kartikchaudhary.immunitywars';
const RULED_NAME = 'Immunity Wars';

describe('the app’s id and name', () => {
  it('are the ones ruled, in Capacitor’s config', () => {
    expect(config.appId).toBe(RULED_ID);
    expect(config.appName).toBe(RULED_NAME);
  });

  it('are the same in every file of the native project that names them', () => {
    const named = {
      'build.gradle applicationId': /applicationId "([^"]+)"/.exec(gradle)?.[1],
      'build.gradle namespace': /namespace = "([^"]+)"/.exec(gradle)?.[1],
      'strings.xml package_name': /<string name="package_name">([^<]+)</.exec(strings)?.[1],
      'MainActivity.java package': /^package ([\w.]+);/m.exec(
        read(`${MAIN}/java/${RULED_ID.split('.').join('/')}/MainActivity.java`),
      )?.[1],
    };
    for (const [where, id] of Object.entries(named)) {
      expect(id, `THE APP HAS TWO IDS: ${where} says ${id ?? 'nothing'}`).toBe(RULED_ID);
    }
    for (const key of ['app_name', 'title_activity_main']) {
      const name = new RegExp(`<string name="${key}">([^<]+)<`).exec(strings)?.[1];
      expect(name, `THE APP HAS TWO NAMES: strings.xml ${key} says ${name ?? 'nothing'}`).toBe(
        RULED_NAME,
      );
    }
  });
});

describe('what the shell is allowed and told', () => {
  it('keeps no backup of the saved game in anybody’s account', () => {
    // No personal data, and no accounts: a hard rule. Android's backup copies an app's data into
    // the Google account the phone is signed in to unless the app says no.
    const allow = /android:allowBackup="([^"]+)"/.exec(manifest)?.[1];
    expect(allow, 'THE SHELL LETS ANDROID BACK THE SAVED GAME UP TO AN ACCOUNT').toBe('false');
  });

  it('is portrait only, as the game is', () => {
    expect(manifest).toMatch(/android:screenOrientation="portrait"/);
  });

  it('asks for the internet and to vibrate, and for nothing else', () => {
    const asked = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(
      (m) => m[1] ?? '',
    );
    expect(asked.sort(), 'THE SHELL ASKS FOR A PERMISSION NOBODY RULED').toEqual([
      'android.permission.INTERNET',
      'android.permission.VIBRATE',
    ]);
  });
});

describe('the icon', () => {
  // Written by `pnpm art:icon` from one render (tools/art-pipeline/icon.ts). Held here to the
  // sizes Android asks for at each density, read from each file's own header, so that a file left
  // over from Capacitor's template, or one written at the wrong size, is named.
  const size = (path: string): string => {
    const png = readFileSync(join(HERE, path));
    return `${String(png.readUInt32BE(16))} by ${String(png.readUInt32BE(20))}`;
  };
  const DENSITIES: [string, number][] = [
    ['mdpi', 1],
    ['hdpi', 1.5],
    ['xhdpi', 2],
    ['xxhdpi', 3],
    ['xxxhdpi', 4],
  ];

  it('is the game’s at every density, in every file Android reads', () => {
    for (const [name, k] of DENSITIES) {
      const dir = `${MAIN}/res/mipmap-${name}`;
      const layer = `${String(108 * k)} by ${String(108 * k)}`;
      const legacy = `${String(48 * k)} by ${String(48 * k)}`;
      expect(size(`${dir}/ic_launcher_foreground.png`), `${dir} foreground`).toBe(layer);
      expect(size(`${dir}/ic_launcher_monochrome.png`), `${dir} monochrome`).toBe(layer);
      expect(size(`${dir}/ic_launcher.png`), `${dir} legacy`).toBe(legacy);
      expect(size(`${dir}/ic_launcher_round.png`), `${dir} legacy, round`).toBe(legacy);
    }
    for (const xml of ['ic_launcher', 'ic_launcher_round']) {
      const adaptive = read(`${MAIN}/res/mipmap-anydpi-v26/${xml}.xml`);
      expect(adaptive, `THE ICON HAS NO THEMED LAYER: ${xml}.xml`).toContain(
        '@mipmap/ic_launcher_monochrome',
      );
      expect(adaptive).toContain('@drawable/ic_launcher_background');
    }
  });

  it('is 512 px square for the store, as a 32-bit PNG', () => {
    expect(size('store/icon-512.png')).toBe('512 by 512');
    // Play asks for a 32-bit PNG, with alpha: colour type 6 in the file's header, at byte 25.
    // Fired by hand, 3 October 2026: the file as first written, without alpha, read type 2.
    const png = readFileSync(join(HERE, 'store/icon-512.png'));
    expect(png[25], 'THE STORE ICON IS NOT A 32-BIT PNG').toBe(6);
  });
});

describe('the size of the text', () => {
  it('is the game’s own, not the phone’s', () => {
    // Ruled 2 October 2026. An Android web view scales every word by the phone's font size unless
    // it is told 100. That it IS 100 on a phone is `pnpm android:check`'s to see; this holds that
    // the native code still says so, which a regenerated MainActivity would not.
    const activity = read(`${MAIN}/java/${RULED_ID.split('.').join('/')}/MainActivity.java`);
    expect(
      /getSettings\(\)\s*\.setTextZoom\(100\)/.test(activity),
      'THE SHELL LEAVES THE TEXT TO THE PHONE’S FONT SIZE',
    ).toBe(true);
  });
});

describe('the shell’s ground', () => {
  const table = COLOUR.table.toLowerCase();

  it('is the kit’s table while the app starts, and behind the system’s bars', () => {
    const colours = read(`${MAIN}/res/values/colors.xml`);
    const native = /<color name="table">(#[0-9a-fA-F]{6})</.exec(colours)?.[1]?.toLowerCase();
    expect(
      native,
      `THE SHELL’S GROUND IS NOT THE KIT’S TABLE: colors.xml says ${native ?? 'nothing'}, the kit’s table is ${table}`,
    ).toBe(table);
    expect(
      config.backgroundColor?.toLowerCase(),
      `THE SHELL’S GROUND IS NOT THE KIT’S TABLE: capacitor.config.ts says ${config.backgroundColor ?? 'nothing'}`,
    ).toBe(table);
  });

  it('is what the window and the launch screen are drawn on', () => {
    const styles = read(`${MAIN}/res/values/styles.xml`);
    expect(styles.match(/android:windowBackground">@color\/table</g)?.length).toBe(2);
    expect(styles).toMatch(/windowSplashScreenBackground">@color\/table</);
  });
});

describe('the release signing', () => {
  // Ruled 3 October 2026: the upload key and its password come from the environment of whoever
  // builds for the store, never from this repository, which is public. A value written into the
  // signing block, or a key file checked in, would be a secret given away.
  it('names no key and no password: each comes from the environment', () => {
    const block = /signingConfigs\s*\{[\s\S]*?\n {4}\}/.exec(gradle)?.[0] ?? '';
    expect(block, 'the signing block is found at all').toContain('upload');
    for (const field of ['storeFile', 'storePassword', 'keyPassword']) {
      const line = block.split('\n').find((l) => l.trim().startsWith(field)) ?? '';
      expect(line, `${field} is set`).not.toBe('');
      const written = line.replace(/System\.getenv\('IW_[A-Z_]+'\)/g, '');
      expect(/["']/.test(written), `A ${field} IS WRITTEN IN THE REPOSITORY: ${line.trim()}`).toBe(
        false,
      );
    }
    expect(gradle).toContain("System.getenv('IW_UPLOAD_KEYSTORE')");
  });

  it('has no key file in the repository, and the ignore rules keep one out', () => {
    const tracked = execSync('git ls-files', { cwd: HERE, encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(jks|keystore|p12)$/i.test(f));
    expect(tracked, 'A KEY FILE IS IN THE REPOSITORY').toEqual([]);
    expect(read('android/.gitignore')).toMatch(/^\*\.jks$/m);
  });
});
