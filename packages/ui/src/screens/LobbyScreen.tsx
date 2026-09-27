/**
 * THE LOBBY (P3.7 piece A, docs/for-P3.md §6): the room's code to share, who is here and who is
 * away, and the fourteen seats. A free seat is taken with a tap and your own is given back with
 * another. The captain chooses the difficulty and starts; everyone else sees who they are waiting on.
 *
 * WHAT IT DOES NOT DECIDE: whether a seat may be taken. The room does, and says no with a code this
 * screen words (`refusalText`). The screen offers only what the room would accept, so a refusal is
 * rare: two players tapping one free seat at once is the ordinary case.
 *
 * A LOST CONNECTION SHOWS RECONNECT AT ONCE (ruled 25 September 2026): nothing rejoins by itself, so
 * rejoining is a choice the player makes.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import type { Seat } from '@immunity-wars/protocol';

import { t } from '../i18n';
import { refusalText, seatRows, startBlock, type LobbyRoom } from '../together/model';
import { BODY, BTN, GROUP, LEAD, PAGE, ROW_BTN, TITLE } from './chrome';

const DIFFS = ['training', 'normal', 'hard'] as const;
type Difficulty = (typeof DIFFS)[number];

const CODE: CSSProperties = {
  fontSize: '2rem',
  letterSpacing: '0.35em',
  fontWeight: 700,
  color: '#2E2A28',
  margin: '6px 0 0',
  textAlign: 'center',
  // At 200% text or page zoom the six widely spaced characters are wider than a phone: they wrap
  // onto a second line rather than push the page sideways (the Gate 1 audit, P3.7). They must still
  // double with the text size, so they are not capped.
  overflowWrap: 'anywhere',
};

const MARK: CSSProperties = { fontSize: '0.8125rem', color: '#78665D', marginLeft: 8 };

export function LobbyScreen({
  room,
  me,
  refusal,
  connectionLost,
  canShare,
  onShare,
  onCopy,
  onClaim,
  onRelease,
  onStart,
  onLeave,
  onReconnect,
}: {
  room: LobbyRoom;
  /** This player's public id in the room. */
  me: number;
  refusal: { code: string; detail?: string } | null;
  connectionLost: boolean;
  /** Whether the phone has a share sheet; Copy is always offered. */
  canShare: boolean;
  onShare: () => void;
  /** Resolves true once the code is on the clipboard. */
  onCopy: () => Promise<boolean>;
  onClaim: (seat: Seat) => void;
  onRelease: (seat: Seat) => void;
  onStart: (difficulty: Difficulty) => void;
  onLeave: () => void;
  onReconnect: () => void;
}): ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>('training');
  const [copied, setCopied] = useState(false);
  const captain = room.members.find((m) => m.id === room.captain) ?? null;
  const iAmCaptain = room.captain === me;
  const rows = seatRows(room, me);
  const live = !connectionLost;
  const block = startBlock(room);
  const mine = room.members.find((m) => m.id === me)?.seats ?? [];

  return (
    <div style={PAGE} data-screen="lobby">
      <h1 style={TITLE}>{t('lobby.title')}</h1>
      <p style={LEAD}>{t('lobby.codeLead')}</p>
      <p style={CODE} data-lobby="code">
        {room.code}
      </p>
      {canShare ? (
        <button data-lobby="share" style={BTN} onClick={onShare}>
          {t('lobby.share')}
        </button>
      ) : null}
      <button
        data-lobby="copy"
        style={BTN}
        onClick={() => {
          void onCopy().then((ok) => setCopied(ok));
        }}
      >
        {copied ? t('lobby.copied') : t('lobby.copy')}
      </button>

      {connectionLost ? (
        <div data-lobby="lost" role="alert" style={{ marginTop: 18 }}>
          <p style={{ ...BODY, color: '#B03A2E' }}>{t('lobby.connectionLost')}</p>
          <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onReconnect}>
            {t('lobby.reconnect')}
          </button>
        </div>
      ) : null}

      <h2 style={{ ...GROUP, marginTop: 22 }}>{t('lobby.players')}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} data-lobby="players">
        {room.members.map((m) => (
          <li key={m.id} style={{ ...BODY, margin: '6px 0' }} data-member={m.id}>
            {m.name}
            {m.id === me ? <span style={MARK}>{t('lobby.you')}</span> : null}
            {m.id === room.captain ? <span style={MARK}>{t('lobby.captain')}</span> : null}
            {!m.connected ? <span style={MARK}>{t('lobby.away')}</span> : null}
          </li>
        ))}
      </ul>

      {/* LEAVE, WHERE IT CAN BE SEEN (ruled 26 September 2026): it was at the foot of the page,
          under fourteen seats, and a player who could not find it closed the app instead, which
          leaves them in the room as away. */}
      <button
        data-lobby="leave"
        style={{ ...BTN, borderColor: '#C48377', marginTop: 12 }}
        onClick={onLeave}
      >
        {t('lobby.leave')}
      </button>
      <p style={LEAD}>{t('lobby.leaveNote')}</p>

      <h2 style={{ ...GROUP, marginTop: 22 }}>{t('lobby.seats')}</h2>
      <p style={LEAD}>{t('lobby.seatsLead')}</p>
      {!iAmCaptain && mine.length === 0 ? (
        <p style={{ ...BODY, color: '#B03A2E' }} data-lobby="need-piece">
          {t('lobby.needPiece')}
        </p>
      ) : null}
      {rows.map((r) => {
        const taken = r.holder !== null && !r.mine;
        const state = r.mine
          ? t('lobby.seatYours')
          : r.holder
            ? t(r.holder.away ? 'lobby.seatHeldAway' : 'lobby.seatHeld', { name: r.holder.name })
            : t('lobby.seatFree');
        return (
          <button
            key={r.seat}
            data-seat={r.seat}
            data-seat-state={r.mine ? 'mine' : taken ? 'taken' : 'free'}
            // A SEAT'S TEXT IS INFORMATION, so it stays readable when the seat cannot be tapped:
            // the colour is set rather than left to the browser's grey for a disabled button, and a
            // taken seat is told apart by its ground and border instead. On that ground the name is
            // 12.2:1 and the smaller lines 4.68:1, computed by the WCAG formula.
            style={{
              ...ROW_BTN,
              color: '#2E2A28',
              cursor: !live || taken ? 'default' : 'pointer',
              background: taken ? '#F3EDE6' : ROW_BTN.background,
              borderColor: r.mine ? '#B03A2E' : taken ? '#94847A' : '#8E6E53',
            }}
            disabled={!live || taken}
            aria-pressed={r.mine}
            onClick={() => (r.mine ? onRelease(r.seat) : onClaim(r.seat))}
          >
            <span style={{ display: 'block' }}>{r.name}</span>
            {r.detail ? (
              <span style={{ display: 'block', fontSize: '0.8125rem', color: '#78665D' }}>
                {r.detail}
              </span>
            ) : null}
            <span style={{ display: 'block', fontSize: '0.8125rem', color: '#78665D' }}>
              {state}
            </span>
          </button>
        );
      })}

      {iAmCaptain ? (
        <section data-lobby="captain" style={{ marginTop: 22 }}>
          <h2 style={GROUP}>{t('lobby.difficulty')}</h2>
          {DIFFS.map((d) => (
            <button
              key={d}
              data-difficulty={d}
              style={{ ...ROW_BTN, borderColor: d === difficulty ? '#B03A2E' : '#8E6E53' }}
              aria-pressed={d === difficulty}
              onClick={() => setDifficulty(d)}
            >
              {t(`difficulty.${d}`)}
            </button>
          ))}
          <button
            data-lobby="start"
            style={{ ...BTN, borderColor: '#B03A2E', marginTop: 16 }}
            disabled={!live || block !== null}
            onClick={() => onStart(difficulty)}
          >
            {t('lobby.start')}
          </button>
          {block?.kind === 'nobodySeated' ? (
            <p style={LEAD}>{t('lobby.startNeedsSeat')}</p>
          ) : block?.kind === 'unseated' ? (
            <p style={LEAD} data-lobby="start-waits">
              {t('lobby.startNeedsPiece', { names: block.names.join(', ') })}
            </p>
          ) : null}
        </section>
      ) : (
        <p style={{ ...BODY, marginTop: 22 }} data-lobby="waiting">
          {t('lobby.waiting', { name: captain?.name ?? '' })}
        </p>
      )}

      {refusal ? (
        <p style={{ ...BODY, color: '#B03A2E' }} data-lobby="refusal" role="alert">
          {refusalText(refusal.code, refusal.detail)}
        </p>
      ) : null}
    </div>
  );
}
