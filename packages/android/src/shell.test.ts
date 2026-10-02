/**
 * THE SHELL IS WHAT WAS RULED (docs/LOOK_PLAN.md §26). The Android project is generated once and
 * then lives as files of its own, in Gradle and XML, where nothing else in this repository looks.
 * A handful of its values are rulings or follow from one, and each is written in more than one
 * file. They are held together here, read from the files themselves.
 *
 * Controls: pnpm ci:selftest android-id-is-one-id, android-keeps-no-backup,
 * android-ground-is-the-kits-table.
 */
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
