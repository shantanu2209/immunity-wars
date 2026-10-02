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
 *
 * DRAWN IN CLAY (stage L5). A seat is a row with the piece's own picture: a cell on its base, a
 * resident as its organ's coin. YOURS is pressed in and ringed in mint, the kit's mark for the
 * chosen one of several; one somebody else holds is flat, and still says who holds it; a free one
 * stands up to be pressed. So the three are told apart by shape as well as by colour, and each
 * says in words which it is.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import type { Seat } from '@immunity-wars/protocol';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';
import { pieceArt } from '../panels/onCard';
import { UpdateNow } from '../panels/UpdateNow';
import { offersUpdate, refusalText, seatRows, startBlock, type LobbyRoom } from '../together/model';

import { BODY, CARD, GROUP, LEAD, PAGE, SAY, STACK, TITLE, WARN } from './chrome';

const DIFFS = ['training', 'normal', 'hard'] as const;
type Difficulty = (typeof DIFFS)[number];

const CODE: CSSProperties = {
  ...TYPE.display,
  fontSize: '2.25rem',
  letterSpacing: '0.3em',
  // The spacing after the last letter would push the code off centre: the same before the first.
  paddingLeft: '0.3em',
  color: COLOUR.onDark,
  margin: '2px 0 0',
  textAlign: 'center',
  // At 200% text or page zoom the six widely spaced characters are wider than a phone: they wrap
  // onto a second line rather than push the page sideways (the Gate 1 audit, P3.7). They must still
  // double with the text size, so they are not capped.
  overflowWrap: 'anywhere',
};

/** A word beside a player's name: you, the captain, away. Quiet, on the card. */
const MARK: CSSProperties = {
  ...TYPE.body,
  fontSize: '0.8125rem',
  color: COLOUR.inkSoft,
  marginLeft: 8,
};

/** A seat: its picture, then its name and what state it is in, in a column beside it. */
const SEAT: CSSProperties = {
  ...STACK,
  justifyContent: 'flex-start',
  textAlign: 'left',
  gap: 10,
  padding: '0.45em 0.8em',
};

/** The seat's picture: a cell on its base, or a resident's organ. */
function SeatArt({ seat }: { seat: Seat }): ReactElement {
  const resident = seat.startsWith('res_');
  return (
    <span
      aria-hidden="true"
      style={{ position: 'relative', width: 40, height: 40, flex: '0 0 auto' }}
    >
      {resident ? null : (
        <img
          alt=""
          src={pieceArt('base')}
          style={{ position: 'absolute', inset: 0, width: '100%' }}
        />
      )}
      <img
        alt=""
        src={pieceArt(resident ? `organ-${seat.slice('res_'.length)}` : seat)}
        style={{ position: 'absolute', inset: 0, width: '100%' }}
      />
    </span>
  );
}

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
  onUpdate,
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
  /** Takes the newer version and reloads (FINDINGS #93), offered under a version refusal only. */
  onUpdate?: () => void;
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {canShare ? (
          <KitButton
            data-lobby="share"
            onPress={onShare}
            style={{ flex: '1 1 8rem', width: 'auto' }}
          >
            {t('lobby.share')}
          </KitButton>
        ) : null}
        <KitButton
          data-lobby="copy"
          style={{ flex: '1 1 8rem', width: 'auto' }}
          onPress={() => {
            void onCopy().then((ok) => setCopied(ok));
          }}
        >
          {copied ? t('lobby.copied') : t('lobby.copy')}
        </KitButton>
      </div>

      {connectionLost ? (
        <div data-lobby="lost" role="alert" style={{ marginTop: 14 }}>
          <p style={WARN}>{t('lobby.connectionLost')}</p>
          <KitButton kind="main" style={STACK} onPress={onReconnect}>
            {t('lobby.reconnect')}
          </KitButton>
        </div>
      ) : null}

      <h2 style={GROUP}>{t('lobby.players')}</h2>
      <ul
        style={{ ...CARD, listStyle: 'none', marginTop: 6, marginBottom: 0 }}
        data-lobby="players"
      >
        {room.members.map((m) => (
          <li key={m.id} style={{ ...BODY, margin: '4px 0', fontWeight: 800 }} data-member={m.id}>
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
      <KitButton data-lobby="leave" style={STACK} onPress={onLeave}>
        {t('lobby.leave')}
      </KitButton>
      <p style={{ ...LEAD, marginTop: 8 }}>{t('lobby.leaveNote')}</p>

      <h2 style={GROUP}>{t('lobby.seats')}</h2>
      <p style={LEAD}>{t('lobby.seatsLead')}</p>
      {!iAmCaptain && mine.length === 0 ? (
        <p style={WARN} data-lobby="need-piece">
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
        // A SEAT'S TEXT IS INFORMATION, so it stays readable when the seat cannot be tapped: a
        // taken seat is the kit's flat button, whose words are a measured pairing, and never the
        // browser's grey for a disabled one. Yours is its chosen one.
        const quiet = r.mine ? COLOUR.mintInk : COLOUR.inkSoft;
        return (
          <KitButton
            key={r.seat}
            data-seat={r.seat}
            data-seat-state={r.mine ? 'mine' : taken ? 'taken' : 'free'}
            style={SEAT}
            selected={r.mine}
            unavailable={taken}
            disabled={!live || taken}
            aria-pressed={r.mine}
            onPress={() => (r.mine ? onRelease(r.seat) : onClaim(r.seat))}
          >
            <SeatArt seat={r.seat} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span>{r.name}</span>
              {r.detail ? (
                <span style={{ ...TYPE.body, fontSize: '0.8125rem', color: quiet }}>
                  {r.detail}
                </span>
              ) : null}
              <span style={{ ...TYPE.body, fontSize: '0.8125rem', color: quiet }}>{state}</span>
            </span>
          </KitButton>
        );
      })}

      {iAmCaptain ? (
        <section data-lobby="captain">
          <h2 style={GROUP}>{t('lobby.difficulty')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {DIFFS.map((d) => (
              <KitButton
                key={d}
                data-difficulty={d}
                style={{ flex: '1 1 5rem', width: 'auto' }}
                selected={d === difficulty}
                aria-pressed={d === difficulty}
                onPress={() => setDifficulty(d)}
              >
                {t(`difficulty.${d}`)}
              </KitButton>
            ))}
          </div>
          <KitButton
            kind="main"
            data-lobby="start"
            style={{ marginTop: 16 }}
            unavailable={!live || block !== null}
            onPress={() => onStart(difficulty)}
          >
            {t('lobby.start')}
          </KitButton>
          {block?.kind === 'nobodySeated' ? (
            <p style={{ ...LEAD, marginTop: 10 }}>{t('lobby.startNeedsSeat')}</p>
          ) : block?.kind === 'unseated' ? (
            <p style={{ ...LEAD, marginTop: 10 }} data-lobby="start-waits">
              {t('lobby.startNeedsPiece', { names: block.names.join(', ') })}
            </p>
          ) : null}
        </section>
      ) : (
        <p style={{ ...SAY, marginTop: 22 }} data-lobby="waiting">
          {t('lobby.waiting', { name: captain?.name ?? '' })}
        </p>
      )}

      {refusal ? (
        <p style={WARN} data-lobby="refusal" role="alert">
          {refusalText(refusal.code, refusal.detail)}
        </p>
      ) : null}
      {refusal && onUpdate && offersUpdate(refusal.code) ? <UpdateNow onUpdate={onUpdate} /> : null}
    </div>
  );
}
