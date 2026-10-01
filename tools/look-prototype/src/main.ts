/**
 * Stage L2: one recorded turn and one spread, in the Clay look, drawn three ways and timed.
 *
 *   (no query)        the menu
 *   ?auto=1           measure all three ways and show the numbers
 *   ?look=live        play the turn in a loop, one way, for looking at   (&tilt=25 for the live way)
 *   ?tap=canvas       time real taps on one way
 *
 * Options for a measurement: &ways=page,canvas,live  &scripts=turn,crowd  &runs=3  &dpr=3
 * and &slow=40, which burns 40 ms in every frame ON PURPOSE: the timer's negative control.
 */
import { fetched, nextFrame, playOnce, refreshPace, SLOW_MS, summarise } from './measure';
import type { RunStats } from './measure';
import recordings from './recording.json';
import type { Recording } from './recording-types';
import { VIEW } from './scene';
import { Timeline } from './timeline';
import type { DrawState, Hud } from './timeline';
import type { Size, Way, WayKey } from './way';

type Script = 'turn' | 'crowd';
const RECORDINGS = recordings as unknown as Record<Script, Recording>;
const WAYS: WayKey[] = ['page', 'canvas', 'live'];
const WAY_NAME: Record<WayKey, string> = {
  page: 'Pictures on the page',
  canvas: 'Pictures on a GPU canvas',
  live: 'Models drawn live',
};
const SCRIPT_NAME: Record<Script, string> = { turn: 'A calm turn', crowd: 'A crowded board' };

const q = new URLSearchParams(location.search);
const list = <T extends string>(key: string, all: T[]): T[] => {
  const v = q.get(key);
  return v ? all.filter((a) => v.split(',').includes(a)) : all;
};
const app = document.getElementById('app') as HTMLElement;

async function makeWay(key: WayKey): Promise<Way> {
  // Each way is its own chunk, fetched when it is first asked for, so its weight is its own.
  if (key === 'page') return new (await import('./ways/page')).PageWay();
  if (key === 'canvas') return new (await import('./ways/canvas')).CanvasWay();
  return new (await import('./ways/live')).LiveWay({ tilt: Number(q.get('tilt') ?? 0) });
}

/* ── the play screen round the board ──────────────────────────────────────── */
interface Screen {
  host: HTMLElement;
  size: Size;
  setHud(h: Hud, note: string): void;
}
function playScreen(recording: Recording): Screen {
  const w = recording.words;
  app.innerHTML = `
<div class="top">
  <div class="pill"><span class="cap">${w.turn}</span><b id="turn"></b><span id="of"></span></div>
  <div class="pill"><span class="cap">AP</span><div class="pips" id="pips"></div></div>
  <div class="way-name" id="note"></div>
</div>
<div class="board" id="board"></div>
<div class="line" id="line"></div>
<div class="sel clay">
  <h2>${w.cells.macrophage}</h2><div class="cap">${w.roles.macrophage}</div>
  <div class="acts"><div class="act on">${w.move}</div><div class="act">${w.engulf}</div><div class="act">${w.undo}</div></div>
</div>
<div class="end">${w.endTurn}</div>`;
  const host = document.getElementById('board') as HTMLElement;
  const width = host.clientWidth;
  const height = Math.round((width * VIEW.h) / VIEW.w);
  host.style.height = `${height}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, Number(q.get('dpr') ?? 3));
  const el = (id: string) => document.getElementById(id) as HTMLElement;
  let shown = '';
  return {
    host,
    size: { w: width, h: height, dpr },
    setHud(h, note) {
      const key = `${h.turn}|${h.ap}|${h.label}|${h.dice.length}|${note}`;
      if (key === shown) return; // the words change a few times a run, not every frame
      shown = key;
      el('turn').textContent = String(h.turn);
      el('of').textContent = `/ ${h.maxTurn}`;
      el('pips').innerHTML = Array.from(
        { length: h.apMax },
        (_, i) => `<i class="${i < h.ap ? 'on' : ''}"></i>`,
      ).join('');
      el('line').innerHTML =
        `${h.label}${h.dice.map((d) => `<span class="die${d.hit ? ' hit' : ''}">${d.face}</span>`).join('')}`;
      el('note').textContent = note;
    },
  };
}

const burn = (ms: number): void => {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    // the negative control: time deliberately wasted inside the frame
  }
};

/* ── measuring ────────────────────────────────────────────────────────────── */
interface WayResult {
  way: WayKey;
  /** From asking for the way to its first frame on screen, code and pictures included. */
  firstDrawMs: number;
  bytes: number;
  requests: number;
  fromCache: number;
  heapMB: number | null;
  info: Record<string, string | number>;
  runs: Array<{ script: Script; run: number } & RunStats>;
}
interface Results {
  when: string;
  device: {
    userAgent: string;
    screen: string;
    devicePixelRatio: number;
    drawnAt: number;
    boardBox: string;
    refreshMs: number;
  };
  slowFrameMs: number;
  control: { slowMs: number };
  ways: WayResult[];
}

async function measure(): Promise<void> {
  const ways = list('ways', WAYS);
  const scripts = list<Script>('scripts', ['turn', 'crowd']);
  const runs = Number(q.get('runs') ?? 3);
  const slow = Number(q.get('slow') ?? 0);
  const first = RECORDINGS[scripts[0] ?? 'turn'];
  const screen0 = playScreen(first);
  const refreshMs = await refreshPace();
  const results: Results = {
    when: new Date().toISOString(),
    device: {
      userAgent: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      drawnAt: screen0.size.dpr,
      boardBox: `${screen0.size.w}x${screen0.size.h}`,
      refreshMs,
    },
    slowFrameMs: SLOW_MS,
    control: { slowMs: slow },
    ways: [],
  };
  for (const key of ways) {
    const screen = playScreen(first);
    screen.setHud(new Timeline(first).hud(0), `${WAY_NAME[key]}: loading`);
    await nextFrame();
    performance.clearResourceTimings();
    const t0 = performance.now();
    const way = await makeWay(key);
    await way.init(screen.host, screen.size);
    way.draw(new Timeline(first).at(0));
    await nextFrame();
    await nextFrame();
    const firstDrawMs = Math.round(performance.now() - t0);
    const got = fetched();
    const out: WayResult = { way: key, firstDrawMs, ...got, heapMB: null, info: {}, runs: [] };
    for (const script of scripts) {
      const timeline = new Timeline(RECORDINGS[script]);
      for (let run = 1; run <= runs; run += 1) {
        const note = `${WAY_NAME[key]}\n${SCRIPT_NAME[script]}, run ${run} of ${runs}`;
        const stats = await playOnce(timeline.duration, (t) => {
          const state = timeline.at(t);
          screen.setHud(timeline.hud(state.beat), note);
          if (slow > 0) burn(slow);
          way.draw(state);
        });
        out.runs.push({ script, run, ...stats });
      }
    }
    out.info = way.info();
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    out.heapMB = mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : null;
    way.dispose();
    results.ways.push(out);
    await new Promise((r) => setTimeout(r, 300));
  }
  show(results);
}

/** The ruling of 1 October: over the line is looked at before it is rejected. */
function verdict(r: RunStats): 'ok' | 'near' | 'over' {
  if (r.slow === 0) return 'ok';
  if (r.slow / r.frames <= 0.01 && r.verySlow === 0) return 'near';
  return 'over';
}

function show(results: Results): void {
  const pooled = (w: WayResult, script: Script): RunStats | null => {
    const rs = w.runs.filter((r) => r.script === script);
    if (rs.length === 0) return null;
    // Runs are pooled by their own numbers: totals summed, the worst kept, the rest averaged.
    const sum = (f: (r: RunStats) => number) => rs.reduce((a, r) => a + f(r), 0);
    const mean = (f: (r: RunStats) => number) => Math.round((sum(f) / rs.length) * 10) / 10;
    return {
      frames: sum((r) => r.frames),
      seconds: Math.round(sum((r) => r.seconds) * 10) / 10,
      median: mean((r) => r.median),
      p95: mean((r) => r.p95),
      p99: Math.max(...rs.map((r) => r.p99)),
      worst: Math.max(...rs.map((r) => r.worst)),
      slow: sum((r) => r.slow),
      verySlow: sum((r) => r.verySlow),
      workMean: mean((r) => r.workMean),
      workP99: Math.max(...rs.map((r) => r.workP99)),
      longTasks: sum((r) => r.longTasks),
    };
  };
  const scripts = [...new Set(results.ways.flatMap((w) => w.runs.map((r) => r.script)))];
  const rows = results.ways
    .flatMap((w) =>
      scripts.map((s) => {
        const p = pooled(w, s);
        if (!p) return '';
        const v = verdict(p);
        return `<tr><td>${WAY_NAME[w.way]}<br><span style="color:#7c6a72">${SCRIPT_NAME[s]}</span></td><td>${p.median}</td><td>${p.p99}</td><td class="${v}">${p.worst}</td><td class="${v}">${p.slow} / ${p.frames}</td><td>${p.workMean}</td></tr>`;
      }),
    )
    .join('');
  const loads = results.ways
    .map(
      (w) =>
        `<tr><td>${WAY_NAME[w.way]}</td><td class="${w.firstDrawMs <= 1000 ? 'ok' : w.firstDrawMs <= 1300 ? 'near' : 'over'}">${w.firstDrawMs}</td><td>${Math.round(w.bytes / 1024)}</td><td>${w.requests}${w.fromCache ? ` (${w.fromCache} cached)` : ''}</td><td>${w.heapMB ?? ''}</td></tr>`,
    )
    .join('');
  const d = results.device;
  app.innerHTML = `<div class="results">
<div class="clay"><h1>L2 measurement</h1>
<div class="dev">${results.when}<br>${d.userAgent}<br>screen ${d.screen} at ${d.devicePixelRatio}x, board ${d.boardBox} drawn at ${d.drawnAt}x, refresh every ${d.refreshMs} ms${results.control.slowMs ? `<br><b>CONTROL: ${results.control.slowMs} ms burned in every frame on purpose</b>` : ''}</div></div>
<div class="clay"><h2>Frames (milliseconds between them)</h2>
<table><tr><th></th><th>typical</th><th>99 in 100</th><th>worst</th><th>slow (${results.slowFrameMs}+)</th><th>own work</th></tr>${rows}</table></div>
<div class="clay"><h2>Loading</h2>
<table><tr><th></th><th>first draw ms</th><th>KB</th><th>files</th><th>heap MB</th></tr>${loads}</table>
<div class="dev">${results.ways
    .map(
      (w) =>
        `${w.way}: ${Object.entries(w.info)
          .map(([k, v]) => `${k} ${v}`)
          .join(', ')}`,
    )
    .join('<br>')}</div></div>
<div class="clay"><h2>Everything, to copy</h2><textarea readonly id="json"></textarea></div>
<button onclick="location.search=''">Back</button></div>`;
  (document.getElementById('json') as HTMLTextAreaElement).value = JSON.stringify(results);
  (window as unknown as { lookResults: Results }).lookResults = results;
  document.title = 'L2: done';
}

/* ── looking, and tapping ─────────────────────────────────────────────────── */
async function look(key: WayKey): Promise<void> {
  const script = (q.get('script') as Script | null) ?? 'turn';
  const recording = RECORDINGS[script];
  const screen = playScreen(recording);
  const way = await makeWay(key);
  await way.init(screen.host, screen.size);
  const timeline = new Timeline(recording);
  const start = await nextFrame();
  for (;;) {
    const now = await nextFrame();
    const state = timeline.at((now - start) % timeline.duration);
    screen.setHud(timeline.hud(state.beat), WAY_NAME[key]);
    way.draw(state);
  }
}

async function tapTest(key: WayKey): Promise<void> {
  const recording = RECORDINGS.turn;
  const screen = playScreen(recording);
  const way = await makeWay(key);
  await way.init(screen.host, screen.size);
  const timeline = new Timeline(recording);
  // Hold on the moment the Monocyte is selected and its legal spaces glow.
  const selectAt = 600 + 900 - 300;
  const slow = Number(q.get('slow') ?? 0);
  const base = timeline.at(selectAt);
  const taken: number[] = [];
  let pending: { stamp: number; x: number; y: number } | null = null;
  let jump: DrawState['selected'] = null;
  screen.host.addEventListener('pointerdown', (ev) => {
    const box = screen.host.getBoundingClientRect();
    pending = { stamp: ev.timeStamp, x: ev.clientX - box.left, y: ev.clientY - box.top };
  });
  const hud = timeline.hud(base.beat);
  const start = await nextFrame();
  for (;;) {
    const now = await nextFrame();
    const state = timeline.at(selectAt + ((now - start) % 250));
    const tap = pending as { stamp: number; x: number; y: number } | null;
    if (tap) {
      // the answer to a tap: the halo jumps to the glowing space nearest the finger
      const k = (screen.size.w / VIEW.w) * state.cam.zoom;
      const bx = state.cam.cx + (tap.x - screen.size.w / 2) / k;
      const by = state.cam.cy + (tap.y - screen.size.h / 2) / k;
      const near = [...state.rings].sort(
        (a, b) => Math.hypot(a.x - bx, a.y - by) - Math.hypot(b.x - bx, b.y - by),
      )[0];
      jump = near ? { x: near.x, y: near.y, a: 1 } : jump;
    }
    // the tap timer's negative control: with ?slow=N the answer is held back N ms on purpose
    if (tap && slow > 0) burn(slow);
    way.draw(jump ? { ...state, selected: jump } : state);
    if (tap) {
      taken.push(Math.round((performance.now() - tap.stamp) * 10) / 10);
      pending = null;
      const s = summarise(taken, taken, 0);
      (window as unknown as { lookTaps: number[] }).lookTaps = taken;
      screen.setHud(
        {
          ...hud,
          label: `tap ${taken.length}: ${taken[taken.length - 1]} ms. typical ${s.median}, worst ${s.worst}`,
          dice: [],
        },
        WAY_NAME[key],
      );
    } else if (taken.length === 0)
      screen.setHud({ ...hud, label: 'Tap a glowing space, ten times', dice: [] }, WAY_NAME[key]);
  }
}

function menu(): void {
  app.innerHTML = `<div class="menu">
<h1>The look, stage L2</h1>
<p>The Clay play screen playing one recorded turn and one spread, drawn three ways. Measuring takes about three minutes: leave the phone alone until the numbers appear.</p>
<button class="primary" id="go">Measure all three</button>
<p>Or look at one way playing in a loop:</p>
<div class="row">${WAYS.map((w) => `<button data-look="${w}">${WAY_NAME[w]}</button>`).join('')}</div>
<button data-look="live" data-tilt="28">Models drawn live, camera tilted</button>
<p>Or time your own taps on one way:</p>
<div class="row">${WAYS.map((w) => `<button data-tap="${w}">${WAY_NAME[w]}</button>`).join('')}</div>
</div>`;
  (document.getElementById('go') as HTMLElement).onclick = () => (location.search = '?auto=1');
  for (const b of app.querySelectorAll<HTMLElement>('[data-look]'))
    b.onclick = () =>
      (location.search = `?look=${b.dataset['look']}${b.dataset['tilt'] ? `&tilt=${b.dataset['tilt']}` : ''}`);
  for (const b of app.querySelectorAll<HTMLElement>('[data-tap]'))
    b.onclick = () => (location.search = `?tap=${b.dataset['tap']}`);
}

const isWay = (v: string | null): v is WayKey => v === 'page' || v === 'canvas' || v === 'live';
const lookAt = q.get('look');
const tapOn = q.get('tap');
const run = q.get('auto')
  ? measure()
  : isWay(lookAt)
    ? look(lookAt)
    : isWay(tapOn)
      ? tapTest(tapOn)
      : Promise.resolve(menu());
run.catch((e: unknown) => {
  app.innerHTML = `<div class="menu"><h1>It stopped</h1><p>${e instanceof Error ? `${e.message}<br>${e.stack ?? ''}` : String(e)}</p></div>`;
  (window as unknown as { lookError: string }).lookError = String(e);
  document.title = 'L2: error';
});
