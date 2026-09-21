/**
 * THE MESSAGES, BOTH WAYS, and the only functions that turn wire text into them.
 *
 * ============================================================================================
 * THE VIEW IS NOT PARSED FIELD BY FIELD, AND THIS IS MEASURED, NOT PREFERRED
 * ============================================================================================
 *
 * Measured on 20 September 2026 against 320 real multiplayer views and 448 burst frames from the
 * engine, before any schema here was written (`docs/for-P3.md` §2):
 *
 * | spelling                            | views arriving byte for byte |
 * |-------------------------------------|------------------------------|
 * | `z.record(z.string(), z.unknown())` | 768 of 768                   |
 * | `z.looseObject({})`                 | 768 of 768                   |
 * | `z.looseObject({ turn: number })`   | **0 of 320**: declared keys move to the front |
 * | `z.object({})`                      | **0 of 768**: it strips every field           |
 *
 * **The most natural spelling delivers an EMPTY view and reports success.** And declaring even one
 * field reorders the object — Task C2's finding (`CLAUDE.md`, "Simulate before building"), which
 * then would have desynchronised `TROPISM` and here would break the burst's tail assertion, which
 * compares the last frame's view with the authoritative one as JSON text.
 *
 * So a view is required to be an object and is otherwise carried untouched: its shape is the
 * engine's, its oracle is the corpus, and a second description of it here would be a second copy of
 * the engine's projection with nothing keeping the two in step.
 *
 * ============================================================================================
 * A REF CROSSES THE WIRE ONCE
 * ============================================================================================
 *
 * A `PlayerRef` is the only thing a rejoin needs, so it is a credential in practice even though it
 * authenticates nothing in principle. It travels client-to-relay in `join` and nowhere else; the
 * relay binds it to the connection and stamps every later message itself. **It is never sent to
 * clients**: members are named on the wire by a public `id`, their join order. (P3.1's room
 * broadcast every ref, which let any member take over any other's seats in one message; corrected
 * in this change, `docs/FINDINGS.md` #77.)
 */
import { z } from 'zod';

import { ERROR_CODES, PROTOCOL_VERSION, RULES_VERSION, SEATS } from './vocabulary.js';

/* --- the header every message carries --------------------------------------------------- */

const Header = z.object({ v: z.number().int(), rules: z.string() });

/** A view, required to be an object and otherwise untouched. See the header of this file. */
const View = z.record(z.string(), z.unknown());

const Seat = z.enum(SEATS);
const MemberId = z.number().int().positive();

/* --- client to relay ---------------------------------------------------------------------- */

const ClientBody = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('join'),
    code: z.string().min(1).max(12),
    // The only message a ref rides on.
    ref: z.string().min(1).max(64),
    // Typed for this room, never stored. Bounded so a name cannot be a payload.
    name: z.string().trim().min(1).max(24),
  }),
  z.object({ kind: z.literal('leave') }),
  z.object({ kind: z.literal('claimSeat'), seat: Seat }),
  z.object({ kind: z.literal('releaseSeat'), seat: Seat }),
  z.object({ kind: z.literal('assignSeat'), seat: Seat, to: MemberId.nullable() }),
  z.object({ kind: z.literal('start'), difficulty: z.enum(['training', 'normal', 'hard']) }),
  // The action is the engine's to judge; the room judges only whose piece it is.
  z.object({ kind: z.literal('action'), action: z.record(z.string(), z.unknown()) }),
]);

export type ClientMessage = z.infer<typeof ClientBody>;

/* --- relay to client ---------------------------------------------------------------------- */

const MemberProjection = z.object({
  id: MemberId,
  name: z.string(),
  connected: z.boolean(),
  seats: z.array(Seat),
});

export const RoomProjectionSchema = z.object({
  code: z.string(),
  phase: z.enum(['lobby', 'playing', 'ended']),
  captain: MemberId.nullable(),
  members: z.array(MemberProjection),
  freeSeats: z.array(Seat),
});

export type RoomProjection = z.infer<typeof RoomProjectionSchema>;

const Frame = z.object({ label: z.string(), dice: z.unknown(), view: View });

const ServerBody = z.discriminatedUnion('kind', [
  /** Who you are in this room, sent to one connection after it joins. */
  z.object({ kind: z.literal('joined'), id: MemberId }),
  z.object({ kind: z.literal('room'), room: RoomProjectionSchema }),
  z.object({ kind: z.literal('view'), view: View }),
  z.object({ kind: z.literal('burst'), frames: z.array(Frame) }),
  z.object({
    kind: z.literal('error'),
    code: z.enum(ERROR_CODES),
    /** The engine's own text for `engine`; otherwise a detail the client may use to word it. */
    detail: z.string().optional(),
  }),
]);

export type ServerMessage = z.infer<typeof ServerBody>;

/* --- the one refusal that is not a message ---------------------------------------------- */

/**
 * A peer on another version. Returned by the decoders instead of a message, because a message from
 * a peer that cannot be read must not be acted on at all. `theirs` is what the peer said, so the
 * client can tell a player which side is out of date.
 */
export interface VersionRefusal {
  readonly refused: 'version';
  readonly ours: { readonly v: number; readonly rules: string };
  readonly theirs: { readonly v: number | null; readonly rules: string | null };
}

/** A message that is not a well-formed message of any kind at all. */
export interface MalformedRefusal {
  readonly refused: 'malformed';
}

export type Decoded<T> =
  | { readonly ok: true; readonly message: T }
  | { readonly ok: false; readonly refusal: VersionRefusal | MalformedRefusal };

const OURS = { v: PROTOCOL_VERSION, rules: RULES_VERSION } as const;

/**
 * THE VERSION CHECK COMES FIRST, and on its own: a peer on another version is refused before its
 * body is looked at, because a body shaped for another version is exactly what cannot be trusted
 * to parse the way it was meant.
 */
function decode<T>(text: string, body: z.ZodType<T>): Decoded<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, refusal: { refused: 'malformed' } };
  }
  // Not an object at all is not a version question: nothing that speaks any version of this
  // protocol sends one.
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return { ok: false, refusal: { refused: 'malformed' } };
  const header = Header.safeParse(raw);
  if (!header.success) {
    const r = raw as { v?: unknown; rules?: unknown } | null;
    return {
      ok: false,
      refusal: {
        refused: 'version',
        ours: OURS,
        theirs: {
          v: typeof r?.v === 'number' ? r.v : null,
          rules: typeof r?.rules === 'string' ? r.rules : null,
        },
      },
    };
  }
  if (header.data.v !== PROTOCOL_VERSION || header.data.rules !== RULES_VERSION) {
    return {
      ok: false,
      refusal: { refused: 'version', ours: OURS, theirs: header.data },
    };
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return { ok: false, refusal: { refused: 'malformed' } };
  return { ok: true, message: parsed.data };
}

/** Relay side: what a client sent. */
export const decodeClient = (text: string): Decoded<ClientMessage> => decode(text, ClientBody);

/** Client side: what the relay sent. */
export const decodeServer = (text: string): Decoded<ServerMessage> => decode(text, ServerBody);

/**
 * THE ONLY WAY A MESSAGE IS WRITTEN: the versions are stamped here, so "every message carries
 * them" is a property of the encoder rather than of every call site remembering to.
 */
export const encode = (message: ClientMessage | ServerMessage): string =>
  JSON.stringify({ v: PROTOCOL_VERSION, rules: RULES_VERSION, ...message });
