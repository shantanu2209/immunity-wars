/**
 * WHAT EACH WAY WEIGHS, read off the build. The page's own count of what it fetched depends on
 * what the browser already had in its cache, so the weight of record is taken here, from the
 * files themselves: the code each way pulls in (followed through the build's manifest) and the
 * art it loads. Sizes are given as stored and as a server would send them (gzip).
 *
 *   pnpm --filter @immunity-wars/look-prototype build:web
 *   pnpm --filter @immunity-wars/look-prototype exec tsx weigh.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');

interface Chunk {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}
const manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8')) as Record<
  string,
  Chunk
>;

/** Every file a chunk needs before it can run: itself and its static imports, not its lazy ones. */
function closure(key: string, seen = new Set<string>()): Set<string> {
  const c = manifest[key];
  if (!c || seen.has(c.file)) return seen;
  seen.add(c.file);
  for (const f of [...(c.css ?? []), ...(c.assets ?? [])]) seen.add(f);
  for (const i of c.imports ?? []) closure(i, seen);
  return seen;
}
const size = (rel: string): { raw: number; gz: number } => {
  const buf = readFileSync(join(DIST, rel));
  return { raw: buf.length, gz: gzipSync(buf).length };
};
const total = (files: Iterable<string>): { raw: number; gz: number; n: number } => {
  let raw = 0;
  let gz = 0;
  let n = 0;
  for (const f of files) {
    const s = size(f);
    raw += s.raw;
    gz += s.gz;
    n += 1;
  }
  return { raw, gz, n };
};
const art = (dir: string, ext: string): string[] =>
  readdirSync(join(DIST, 'art', dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => (dir === '.' ? `art/${f}` : `art/${dir}/${f}`));
const kb = (n: number): string => `${(n / 1024).toFixed(0).padStart(6)} KB`;

const shell = closure('index.html');
shell.add('index.html');
const pictures = [...art('.', '.webp'), ...art('pieces', '.webp')];
const models = [...art('models', '.glb'), ...art('tex', '.webp')];
const WAYS: Array<{ name: string; key: string; art: string[] }> = [
  { name: 'Pictures on the page', key: 'src/ways/page.ts', art: pictures },
  { name: 'Pictures on a GPU canvas', key: 'src/ways/canvas.ts', art: pictures },
  { name: 'Models drawn live', key: 'src/ways/live.ts', art: models },
];

const s = total(shell);
console.log(
  `shared by all three (page shell, recording, typeface): ${s.n} files, ${kb(s.raw)} stored, ${kb(s.gz)} sent`,
);
console.log('');
console.log(
  'way                        code stored  code sent   art stored   art sent   TOTAL sent',
);
for (const w of WAYS) {
  const code = [...closure(w.key)].filter((f) => !shell.has(f));
  const c = total(code);
  const a = total(w.art);
  console.log(
    `${w.name.padEnd(26)} ${kb(c.raw)}  ${kb(c.gz)}   ${kb(a.raw)}  ${kb(a.gz)}   ${kb(c.gz + a.gz)}   (${c.n} code files, ${a.n} art files)`,
  );
}
