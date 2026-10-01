/**
 * THE KIT PAGE — stage L3 of docs/LOOK_PLAN.md (§13), the thing Shantanu approves.
 *
 * Every part of the Clay kit, shown as the real component and not a drawing of it: each colour
 * with the contrast the kit's own test measured, the type at rest and at 200%, every control in
 * each state, a card, every piece at the size it has on the board and on a card, and each motion,
 * sound and buzz, played by pressing.
 *
 * A developer's page. Its own headings are written here in English, as the dev shell's are; the
 * GAME's words on it (names, classes, advice) come from the content pack and the catalogue, so
 * what is judged is the real text at its real length.
 */
import {
  BEAT_BY_TYPE,
  DZINFO,
  DZSTATS,
  FAMILIES,
  FAMILY,
  ORGANS,
  TROPISM,
  UI_,
  UM,
} from '@immunity-wars/content';
import { t } from '@immunity-wars/ui';
import {
  BOUND,
  CLAY_CELLS,
  COLOUR,
  KitButton,
  KitCard,
  KitChip,
  KitMeter,
  KitPiece,
  KitPieceCard,
  KitPill,
  KitPips,
  KitRow,
  KitSheet,
  SOUNDS,
  TOUCH,
  TYPE,
  kitAudio,
  measure,
  play,
  prefersReducedMotion,
  soundLength,
  type KitSound,
} from '@immunity-wars/ui/kit';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';

const cells = UM as Record<string, { n: string; r: string }>;
const kinds = UI_ as Record<string, { n: string }>;
const classes = FAMILIES as Record<string, { name: string; col: string }>;

/** Every picture of what invades, as the pipeline names it: a kind and its antigen class. */
const INVADERS: Array<{ name: string; kind: string; cls: string; coated?: boolean }> = [
  { name: 'virus-ENV', kind: 'virus', cls: 'ENV' },
  { name: 'virus-NAK', kind: 'virus', cls: 'NAK' },
  { name: 'bacteria-EXB', kind: 'bacteria', cls: 'EXB' },
  { name: 'bacteria-EXB-coated', kind: 'bacteria', cls: 'EXB', coated: true },
  { name: 'bacteria-ICB', kind: 'bacteria', cls: 'ICB' },
  { name: 'bacteria-ICB-coated', kind: 'bacteria', cls: 'ICB', coated: true },
  { name: 'fungus-EUK', kind: 'fungus', cls: 'EUK' },
  { name: 'parasite-EUK', kind: 'parasite', cls: 'EUK' },
  { name: 'parasite-EUK-coated', kind: 'parasite', cls: 'EUK', coated: true },
  { name: 'worm-EUK', kind: 'worm', cls: 'EUK' },
  { name: 'worm-EUK-coated', kind: 'worm', cls: 'EUK', coated: true },
  { name: 'malaria-EUK', kind: 'malaria', cls: 'EUK' },
  { name: 'hidden-ENV', kind: 'hidden', cls: 'ENV' },
  { name: 'hidden-NAK', kind: 'hidden', cls: 'NAK' },
  { name: 'hidden-EUK', kind: 'hidden', cls: 'EUK' },
  { name: 'toxin-TOX', kind: 'toxin', cls: 'TOX' },
  { name: 'venom-TOX', kind: 'venom', cls: 'TOX' },
];
const invaderLabel = (i: (typeof INVADERS)[number]): string =>
  `${kinds[i.kind]?.n ?? i.kind}${i.coated ? `, ${t('inspect.coated')}` : ''}`;

const H2: CSSProperties = { ...TYPE.heading, color: COLOUR.onDark, margin: '2em 0 0.2em' };
const NOTE: CSSProperties = { ...TYPE.body, color: COLOUR.onDarkSoft, margin: '0 0 0.9em' };
const CAP: CSSProperties = { ...TYPE.label, color: COLOUR.onDarkSoft };

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section>
      <h2 style={H2}>{title}</h2>
      <p style={NOTE}>{note}</p>
      {children}
    </section>
  );
}

function Colours(): ReactElement {
  const swatches = Object.entries(COLOUR);
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(4.8rem, 1fr))',
          gap: 8,
        }}
      >
        {swatches.map(([name, hex]) => (
          <div key={name}>
            <div
              style={{
                height: 44,
                borderRadius: 12,
                background: hex,
                boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.18)',
              }}
            />
            <div
              style={{
                ...TYPE.label,
                letterSpacing: 0,
                textTransform: 'none',
                color: COLOUR.onDark,
                marginTop: 3,
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: COLOUR.onDarkSoft }}>
              {hex}
            </div>
          </div>
        ))}
      </div>
      <KitCard style={{ marginTop: 14 }}>
        <div style={{ ...TYPE.label, color: COLOUR.inkSoft, marginBottom: 6 }}>
          Every pairing, as the kit’s test measures it
        </div>
        {measure().map((m) => (
          <div
            key={m.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.3em 0',
              borderTop: `1.5px solid ${COLOUR.creamEdge}`,
            }}
          >
            <span
              style={{
                flex: '0 0 2.6em',
                height: '1.7em',
                borderRadius: 7,
                background: m.bg,
                color: m.fg,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                fontSize: '0.8125rem',
                boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.2)',
              }}
            >
              Aa
            </span>
            <span style={{ flex: 1, ...TYPE.body, fontSize: '0.8125rem' }}>{m.name}</span>
            <span
              style={{
                ...TYPE.body,
                fontSize: '0.8125rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: m.ok ? COLOUR.mintInk : COLOUR.coralEdge,
              }}
            >
              {m.ratio.toFixed(2)}{' '}
              <span style={{ fontWeight: 600, color: COLOUR.inkSoft }}>/ {BOUND[m.bound]}</span>
            </span>
          </div>
        ))}
      </KitCard>
    </>
  );
}

function Type(): ReactElement {
  const rows: Array<[string, CSSProperties, string]> = [
    ['display', TYPE.display, t('title.name')],
    ['title', TYPE.title, 'Cellulitis'],
    ['heading', TYPE.heading, cells['macrophage']?.n ?? ''],
    ['action', TYPE.action, t('play.endCommand')],
    ['body', TYPE.body, (BEAT_BY_TYPE as Record<string, string>)['fungus'] ?? ''],
    ['label', TYPE.label as CSSProperties, cells['macrophage']?.r ?? ''],
  ];
  return (
    <div>
      {rows.map(([name, style, words]) => (
        <div key={name} style={{ marginBottom: '0.8em' }}>
          <div style={CAP}>
            {name} · {style.fontSize} · {style.fontWeight}
          </div>
          <div style={{ ...style, color: COLOUR.onDark, fontFamily: TYPE.family }}>{words}</div>
        </div>
      ))}
    </div>
  );
}

function Controls(): ReactElement {
  const [ap, setAp] = useState(3);
  const [presses, setPresses] = useState(0);
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <KitPill>
          <span style={TYPE.label as CSSProperties}>{t('play.turn')}</span>
          <b style={{ fontSize: '1.2rem', fontWeight: 900 }}>8</b>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: COLOUR.onDarkSoft }}>
            / 15
          </span>
        </KitPill>
        <KitPill>
          <span style={TYPE.label as CSSProperties}>AP</span>
          <KitPips have={ap} of={6} label={`AP ${ap} / 6`} />
        </KitPill>
      </div>
      <KitCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <KitPiece name="macrophage" view="card" size={76} label="" />
          <div>
            <div style={TYPE.heading}>{cells['macrophage']?.n}</div>
            <div style={{ ...(TYPE.label as CSSProperties), color: COLOUR.inkSoft, marginTop: 3 }}>
              {cells['macrophage']?.r}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <KitRow>
            <KitButton kind="go" onPress={() => setAp((n) => (n > 0 ? n - 1 : 6))}>
              {t('action.move')}
            </KitButton>
            <KitButton unavailable>{t('action.engulf')}</KitButton>
            <KitButton onPress={() => setAp((n) => Math.min(6, n + 1))}>{t('dock.undo')}</KitButton>
          </KitRow>
        </div>
      </KitCard>
      <div style={{ marginTop: 22 }}>
        <KitButton kind="main" onPress={() => setPresses((n) => n + 1)}>
          {t('play.endCommand')}
        </KitButton>
      </div>
      <p style={{ ...NOTE, marginTop: 14 }}>
        Move spends an Action Point, Undo gives one back, the main button has been pressed {presses}{' '}
        times. The middle button cannot be used and is drawn pressed flat. Every control is at least{' '}
        {TOUCH.control} px tall; Gate 1 asks for {TOUCH.min}.
      </p>
    </>
  );
}

function Card(): ReactElement {
  const disease = 'Cellulitis';
  const cls = classes[(FAMILY as Record<string, string>)[disease] ?? ''];
  const stats = (DZSTATS as Record<string, [number, number, number, number, string]>)[disease];
  const info = (DZINFO as Record<string, { c: string; p: string; r: string }>)[disease];
  const organs = ((TROPISM as Record<string, string[]>)[disease] ?? []).map(
    (o) => (ORGANS as Record<string, { name: string }>)[o]?.name ?? o,
  );
  if (!cls || !stats || !info) return <p style={NOTE}>The content pack has no {disease}.</p>;
  return (
    <KitPieceCard
      piece="bacteria-EXB-coated"
      pieceLabel={kinds['bacteria']?.n ?? ''}
      kicker={t('card.title')}
      name={disease}
      chips={
        <>
          <KitChip dot={cls.col}>{cls.name}</KitChip>
          <KitChip>{stats[4]}</KitChip>
          <KitChip tone="now">{t('inspect.coated')}</KitChip>
        </>
      }
      meters={[
        { label: t('card.contagion'), value: stats[0] },
        { label: t('card.severity'), value: stats[1] },
        { label: t('card.speed'), value: stats[2] },
        { label: t('card.cunning'), value: stats[3] },
      ]}
      adviceLabel={t('card.beatIt')}
      advice={(BEAT_BY_TYPE as Record<string, string>)['bacteria'] ?? ''}
      rows={[
        { label: t('card.canInfect'), text: organs.join(', ') },
        { label: t('card.causes'), text: info.c },
        { label: t('card.prevent'), text: info.p },
        { label: t('card.treat'), text: info.r },
      ]}
    />
  );
}

const GROUND: CSSProperties = {
  background: COLOUR.board,
  borderRadius: 20,
  padding: '10px 6px 12px',
  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
  display: 'grid',
  // As many across as fit a picture and its name: four at rest, two with the words at 200%.
  gridTemplateColumns: 'repeat(auto-fit, minmax(max(72px, 4.4rem), 1fr))',
  gap: '6px 2px',
  justifyItems: 'center',
};
function Tile({
  children,
  words,
  sub,
}: {
  children: ReactNode;
  words: string;
  sub?: ReactNode;
}): ReactElement {
  return (
    <div style={{ textAlign: 'center', width: '100%' }}>
      <div style={{ display: 'grid', placeItems: 'center' }}>{children}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLOUR.onDark, lineHeight: 1.15 }}>
        {words}
      </div>
      {sub}
    </div>
  );
}
function Pieces({ view }: { view: 'board' | 'card' }): ReactElement {
  const size = 72;
  return (
    <>
      <div style={{ ...CAP, margin: '0 0 6px' }}>
        Your cells{view === 'board' ? ', each on its base' : ''}
      </div>
      <div style={GROUND}>
        {CLAY_CELLS.map((k) => (
          <Tile key={k} words={cells[k]?.n ?? k}>
            <KitPiece name={k} view={view} size={size} onBase={view === 'board'} label="" />
          </Tile>
        ))}
      </div>
      <div style={{ ...CAP, margin: '14px 0 6px' }}>What invades</div>
      <div style={GROUND}>
        {INVADERS.map((i) => (
          <Tile
            key={i.name}
            words={invaderLabel(i)}
            sub={
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: COLOUR.onDarkSoft,
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: classes[i.cls]?.col,
                    boxShadow: `0 0 0 1px ${COLOUR.onDark}`,
                  }}
                />
                {i.cls}
              </div>
            }
          >
            <KitPiece name={i.name} view={view} size={size} label="" />
          </Tile>
        ))}
      </div>
    </>
  );
}

function BoardSize(): ReactElement {
  // On the phone a piece's picture is 50 px across with the whole board in view, and a cell in
  // the bloodstream or an organ's resident smaller still. This is that, on the board's colour.
  return (
    <div
      style={{
        ...GROUND,
        gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))',
        padding: '8px 4px',
      }}
    >
      {CLAY_CELLS.map((k) => (
        <KitPiece key={k} name={k} size={50} onBase label={cells[k]?.n ?? k} />
      ))}
      <KitPiece name="macrophage" size={31} onBase label="" style={{ alignSelf: 'center' }} />
      {INVADERS.map((i) => (
        <KitPiece key={i.name} name={i.name} size={50} label={invaderLabel(i)} />
      ))}
    </div>
  );
}

/** How far the cell hops in the demonstration, in px. */
const HOP = 84;

function Motion(): ReactElement {
  const [side, setSide] = useState(0);
  const [there, setThere] = useState(true);
  const [coated, setCoated] = useState(false);
  const [integrity, setIntegrity] = useState(3);
  const [less, setLess] = useState(false);
  const cell = useRef<HTMLDivElement>(null);
  const invader = useRef<HTMLDivElement>(null);
  const organ = useRef<HTMLDivElement>(null);
  const was = useRef(0);
  const asked = prefersReducedMotion();
  const reduced = less || asked;

  // The cell is DRAWN in its new place first, and the hop is played from where it was.
  useLayoutEffect(() => {
    if (was.current !== side && cell.current)
      void play(cell.current, 'move', { dx: (was.current - side) * HOP, reduced });
    was.current = side;
    // Played once per move, not again when the motion setting changes.
  }, [side]);
  useLayoutEffect(() => {
    if (invader.current) void play(invader.current, coated ? 'coat' : 'arrive', { reduced });
    // Played when the picture changes, not again when the motion setting changes.
  }, [there, coated]);

  const engulf = (): void => {
    const eater = cell.current;
    const eaten = invader.current;
    if (!eater || !eaten) return;
    const a = eater.getBoundingClientRect();
    const b = eaten.getBoundingClientRect();
    void play(eater, 'engulf', { reduced });
    void play(eaten, 'leave', {
      dx: a.left - b.left,
      dy: a.top - b.top,
      reduced,
      hold: true,
    }).then(() => {
      setThere(false);
      setCoated(false);
    });
  };

  return (
    <>
      <div
        style={{
          position: 'relative',
          height: 104,
          background: COLOUR.board,
          borderRadius: 20,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
        }}
      >
        <div ref={cell} style={{ position: 'absolute', left: 14 + side * HOP, top: 12 }}>
          <KitPiece name="macrophage" size={80} onBase label={cells['macrophage']?.n ?? ''} />
        </div>
        {there ? (
          <div ref={invader} style={{ position: 'absolute', right: 18, top: 12 }}>
            <KitPiece
              name={coated ? 'bacteria-EXB-coated' : 'bacteria-EXB'}
              size={80}
              label={kinds['bacteria']?.n ?? ''}
            />
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 10 }}>
        <KitRow>
          <KitButton kind="go" sound="move" onPress={() => setSide((s) => 1 - s)}>
            {t('action.move')}
          </KitButton>
          <KitButton kind="go" sound="engulf" unavailable={!there} onPress={engulf}>
            {t('action.engulf')}
          </KitButton>
          <KitButton sound="coat" unavailable={!there || coated} onPress={() => setCoated(true)}>
            Coat
          </KitButton>
          <KitButton sound="arrive" unavailable={there} onPress={() => setThere(true)}>
            Arrive
          </KitButton>
          <KitButton
            sound="refuse"
            onPress={() => {
              if (cell.current) void play(cell.current, 'refuse', { reduced });
            }}
          >
            Refuse
          </KitButton>
        </KitRow>
      </div>
      <KitCard style={{ marginTop: 14 }}>
        <div ref={organ}>
          <KitMeter
            label={(ORGANS as Record<string, { name: string }>)['spleen']?.name ?? ''}
            value={integrity}
            of={3}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <KitButton
            sound="hurt"
            onPress={() => {
              setIntegrity((n) => (n > 0 ? n - 1 : 3));
              if (organ.current) void play(organ.current, 'hurt', { reduced });
            }}
          >
            Damage it
          </KitButton>
        </div>
      </KitCard>
      <div style={{ marginTop: 14 }}>
        <KitButton onPress={() => setLess((l) => !l)}>
          {less ? 'Less motion is on. Put it back' : 'Show it with less motion'}
        </KitButton>
      </div>
      <p style={{ ...NOTE, marginTop: 10 }}>
        {asked
          ? 'This phone asks for less motion, so that is what is shown: nothing travels, things fade or blink.'
          : 'This phone has not asked for less motion. The button shows what a phone that has would see: nothing travels, things fade or blink.'}
      </p>
    </>
  );
}

const SOUND_WORDS: Record<KitSound, string> = {
  tap: 'Tap',
  move: 'Move',
  engulf: 'Engulf',
  coat: 'Coat',
  arrive: 'Arrive',
  hurt: 'Damage',
  refuse: 'Refuse',
  endTurn: 'End of turn',
  win: 'Win',
  loss: 'Loss',
};

function Sound(): ReactElement {
  const [muted, setMuted] = useState(kitAudio.muted);
  const canBuzz = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  return (
    <>
      <KitRow>
        {(Object.keys(SOUNDS) as KitSound[]).map((s) => (
          <KitButton key={s} sound={s}>
            {/* The length sits under the word, so a long word at 200% has the button's whole width. */}
            <span style={{ display: 'grid', justifyItems: 'center', lineHeight: 1.15 }}>
              {SOUND_WORDS[s]}
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLOUR.inkSoft }}>
                {Math.round(soundLength(s) * 1000)} ms
              </span>
            </span>
          </KitButton>
        ))}
      </KitRow>
      <div style={{ marginTop: 14 }}>
        <KitButton
          onPress={() => {
            kitAudio.muted = !kitAudio.muted;
            setMuted(kitAudio.muted);
          }}
        >
          {muted ? 'Muted: no sound, no buzz. Turn them on' : 'Mute sound and buzz'}
        </KitButton>
      </div>
      <p style={{ ...NOTE, marginTop: 10 }}>
        {canBuzz
          ? 'This browser lets a page ask the phone to buzz. Tap, move, engulf, coat, damage, refuse and end of turn each do.'
          : 'This browser does not let a page ask for a buzz, so only the sounds are played here.'}{' '}
        Every button on this page plays the tap. The phone’s own silent mode and media volume still
        apply.
      </p>
    </>
  );
}

function Kit(): ReactElement {
  const [big, setBig] = useState(false);
  useEffect(() => {
    document.documentElement.style.fontSize = big ? '200%' : '';
  }, [big]);
  return (
    <main
      style={{
        maxWidth: 440,
        margin: '0 auto',
        padding: '18px 14px 60px',
        fontFamily: TYPE.family,
        color: COLOUR.onDark,
      }}
    >
      <h1 style={{ ...TYPE.title, margin: 0 }}>The Clay kit</h1>
      <p style={NOTE}>
        Stage L3. Every part is the real component. Say what is wrong by name, and it is one line to
        change.
      </p>
      <KitButton onPress={() => setBig((b) => !b)}>
        {big ? 'Text is at 200%. Put it back' : 'Show every word at 200%'}
      </KitButton>

      <Section
        title="Pieces at the size they have on the board"
        note="50 px across with the whole board in view; the small one is an organ’s resident. Your cells stand on a base, and an invader never does."
      >
        <BoardSize />
      </Section>
      <Section
        title="Controls"
        note="Press them. A button stands on its own edge and sinks under a finger."
      >
        <Controls />
      </Section>
      <Section
        title="Motion"
        note="Press them. Each thing that happens has its own motion, its own sound and, on a phone that allows it, its own buzz."
      >
        <Motion />
      </Section>
      <Section
        title="Sound and touch"
        note="Ten sounds, made in code: there is no sound file. Sound is on unless muted; the mute goes in Settings."
      >
        <Sound />
      </Section>
      <Section
        title="A card"
        note="What a press and hold on a piece opens. The words are the content pack’s."
      >
        <Card />
      </Section>
      <Section title="A sheet" note="The same clay, rising from the bottom edge.">
        <KitSheet>
          <div style={TYPE.heading}>{t('body.title')}</div>
          <p style={{ ...TYPE.body, margin: '0.3em 0 0.8em' }}>
            {(ORGANS as Record<string, { bio: string }>)['spleen']?.bio}
          </p>
          <KitMeter
            label={(ORGANS as Record<string, { name: string }>)['spleen']?.name ?? ''}
            value={2}
            of={3}
          />
        </KitSheet>
      </Section>
      <Section
        title="Every piece, seen from above"
        note="As the board shows them, larger than life so the detail can be judged."
      >
        <Pieces view="board" />
      </Section>
      <Section title="Every piece, seen at an angle" note="As a card and the title show them.">
        <Pieces view="card" />
      </Section>
      <Section
        title="Type"
        note="One typeface, Nunito, at six sizes. All are set in rem, so the phone’s own text size scales them."
      >
        <Type />
      </Section>
      <Section
        title="Colour"
        note="Each pairing that carries words or marks a control, with the contrast measured and the bound it must reach."
      >
        <Colours />
      </Section>
    </main>
  );
}

const root = document.getElementById('app');
if (root) createRoot(root).render(<Kit />);
