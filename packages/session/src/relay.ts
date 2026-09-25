/**
 * `RelaySession` — the SECOND implementation of `Session`, for a game played through the relay
 * (P3.4). And `RelayRoom`, the connection and the lobby it is reached through.
 *
 * Constraint 3 in `types.ts` is why this is an implementation and not a rewrite: `sendAction` was
 * async from the start "so that `RelaySession` is a second implementation and not a rewrite", and
 * the UI was built against the interface with the engine forbidden to it (`ui-app-no-engine`).
 *
 * ============================================================================================
 * WHAT A RELAY CLIENT KNOWS, AND WHERE IT COMES FROM
 * ============================================================================================
 *
 * Nothing about the game is computed here. The relay holds the engine; every view arrives with
 * `queries` and the scoped answers for EVERY cell and family, computed by the same builder
 * `LocalSession` calls (`@immunity-wars/session-core`, ruled 24 September 2026). The one thing
 * this file computes is which of those scoped answers the player's selection wants — `scopeFrom`,
 * held equal to `scope` on 208 real states by `tests/session/src/relay-queries.test.ts`.
 *
 * ============================================================================================
 * WHAT IS NOT THE SAME AS `LocalSession`, ON PURPOSE
 * ============================================================================================
 *
 * - **Undo is unavailable** (`reason: 'multiplayer'`): the engine's undo stack is the game's, not
 *   a player's, and the relay refuses it (FINDINGS #79).
 * - **`save()` does nothing**: the relay holds the game. Whether the captain's device should keep
 *   an autosave is brief §5's open question, not decided here.
 * - **The selection clears when the TURN or the DRAWN CARD changes**, where `LocalSession` clears
 *   it after an accepted `draw` or `endCommand`. Here another player's action can cross the
 *   boundary, and the view does not name the action, so the boundary is read off the view: `draw`
 *   sets the drawn card and `endCommand` advances the turn and clears it, which are exactly the
 *   two. Held against `LocalSession` action for action in `packages/server/src/relay.test.ts`.
 * - **A dropped connection is not reconnected automatically.** A member rejoins with the same code
 *   and the same `self`, and gets their seats back; doing that without asking is the multiplayer
 *   screens' job (P3.7), once it is known what they should show.
 */
import {
  SERVER_FRAME_LIMIT,
  decodeServer,
  encode,
  pack,
  unpack,
  type ClientMessage,
  type ErrorCode,
  type RoomProjection,
  type Seat,
  type ServerMessage,
} from '@immunity-wars/protocol';
import { scopeFrom, type AllScoped } from '@immunity-wars/session-core';

import { newPlayerRef } from './player-ref.js';
import {
  NO_SELECTION,
  type ActionOutcome,
  type BurstFrame,
  type Listener,
  type PlayerRef,
  type PrecomputedQueries,
  type Selection,
  type Session,
  type SessionEvent,
  type SessionView,
  type UndoAvailability,
  type Unsubscribe,
  type ViewState,
} from './types.js';

export interface RelayOptions {
  readonly url: string;
  /** Typed for this room. It lives in the room and dies with it (brief §5). */
  readonly name: string;
  /** Rejoining needs the same `self`; a fresh one is minted when none is given. */
  readonly self?: PlayerRef;
  /** Opens the socket. The platform's `WebSocket` by default; injected for runtimes and tests. */
  readonly open?: (url: string) => WebSocket;
}

/**
 * WHY A ROOM COULD NOT BE ENTERED, as a code for the catalogue: a room refusal (`noSuchRoom`,
 * `gameEnded`), `version` when the relay speaks another version, or `closed` when the connection
 * ended first.
 *
 * `closeCode` is the WebSocket close code when the connection ended first, and null otherwise. The
 * relay refuses some entries by closing with a reason and sending nothing (`busy`, `slowDown`, the
 * hub's `CLOSE`), so without it a player told to wait would read that the connection was lost (P3.7).
 */
export class RelayError extends Error {
  constructor(
    readonly code: ErrorCode | 'closed',
    readonly closeCode: number | null = null,
  ) {
    super(code);
    this.name = 'RelayError';
  }
}

export type RoomEvent =
  | { readonly kind: 'room'; readonly room: RoomProjection }
  /** The room refused something that was not an action: a seat, a start, an assignment. */
  | { readonly kind: 'refused'; readonly code: ErrorCode; readonly detail?: string }
  /**
   * The connection ended. `code` is the WebSocket close code: 4001 `version`, 4004 `replaced`
   * (this member joined again elsewhere), 4005 `left`, or the transport's own.
   */
  | { readonly kind: 'closed'; readonly code: number };

type ViewMessage = Extract<ServerMessage, { kind: 'view' }>;
type ResultMessage = Extract<ServerMessage, { kind: 'result' }>;

const MULTIPLAYER_UNDO: UndoAvailability = {
  available: false,
  moves: 0,
  reason: 'multiplayer',
  committedBy: null,
};

/** What changes exactly when `LocalSession` would clear the selection: see the header. */
const boundaryOf = (view: ViewState): string =>
  JSON.stringify([view['turn'] ?? null, (view['drawn'] ?? null) !== null]);

export class RelayRoom {
  readonly self: PlayerRef;
  private readonly socket: WebSocket;
  private me: number | null = null;
  private projection: RoomProjection | null = null;
  private relaySession: RelaySession | null = null;
  private readonly waiting: ((s: RelaySession) => void)[] = [];
  private readonly listeners = new Set<(e: RoomEvent) => void>();
  /** Frames are unpacked asynchronously, so both directions are chained to keep their order. */
  private inbound: Promise<void> = Promise.resolve();
  private outbound: Promise<void> = Promise.resolve();
  private entered: { resolve: () => void; reject: (e: RelayError) => void } | null = null;
  private isClosed = false;

  /** A new room; the relay mints its code, and its creator is its captain. */
  static create(options: RelayOptions): Promise<RelayRoom> {
    const self = options.self ?? newPlayerRef();
    return RelayRoom.enter(options, self, { kind: 'create', ref: self, name: options.name });
  }

  /** An existing room, by the code someone shared. The same `self` as before is a rejoin. */
  static join(options: RelayOptions & { readonly code: string }): Promise<RelayRoom> {
    const self = options.self ?? newPlayerRef();
    return RelayRoom.enter(options, self, {
      kind: 'join',
      code: options.code,
      ref: self,
      name: options.name,
    });
  }

  private static async enter(
    options: RelayOptions,
    self: PlayerRef,
    first: ClientMessage,
  ): Promise<RelayRoom> {
    const open = options.open ?? ((url: string): WebSocket => new WebSocket(url));
    const room = new RelayRoom(open(options.url), self);
    await room.handshake(first);
    return room;
  }

  private constructor(socket: WebSocket, self: PlayerRef) {
    this.self = self;
    this.socket = socket;
    socket.binaryType = 'arraybuffer';
    socket.addEventListener('message', (e: MessageEvent) => {
      const bytes = new Uint8Array(e.data as ArrayBuffer);
      this.inbound = this.inbound.then(() => this.receive(bytes)).catch(() => undefined);
    });
    socket.addEventListener('close', (e: CloseEvent) => {
      // Queued behind every frame that arrived before it, so nothing is lost to the close.
      this.inbound = this.inbound
        .then(() => {
          this.onClose(e.code);
        })
        .catch(() => undefined);
    });
  }

  private handshake(first: ClientMessage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.entered = { resolve, reject };
      const go = (): void => {
        this.send(first);
      };
      if (this.socket.readyState === 1) go();
      else this.socket.addEventListener('open', go, { once: true });
    });
  }

  /** This member's public id in the room: their join order. */
  get id(): number {
    return this.me ?? 0;
  }

  get code(): string {
    return this.projection?.code ?? '';
  }

  get room(): RoomProjection | null {
    return this.projection;
  }

  subscribe(listener: (e: RoomEvent) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  claimSeat(seat: Seat): void {
    this.send({ kind: 'claimSeat', seat });
  }

  releaseSeat(seat: Seat): void {
    this.send({ kind: 'releaseSeat', seat });
  }

  /** The captain hands an away member's seat to a present member, by public id, or frees it. */
  assignSeat(seat: Seat, to: number | null): void {
    this.send({ kind: 'assignSeat', seat, to });
  }

  start(difficulty: 'training' | 'normal' | 'hard'): void {
    this.send({ kind: 'start', difficulty });
  }

  /**
   * Leaving is a decision: the seats go back to the table. Closing the app is not leaving.
   *
   * Settles once the message has gone, because sending is asynchronous (every frame is gzipped
   * first): a caller that closes the connection the moment `leave` returns would otherwise close it
   * before the message is sent, and the player would be left in the room, away, holding their seats.
   */
  leave(): Promise<void> {
    this.send({ kind: 'leave' });
    return this.outbound;
  }

  /** The game, once it has started. Resolves on the first view, which is the game's start. */
  session(): Promise<RelaySession> {
    if (this.relaySession) return Promise.resolve(this.relaySession);
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  /** Drops the connection. The member is AWAY, not gone: their seats wait for them (ruling 4). */
  close(): void {
    this.socket.close(1000, 'closed');
  }

  /** @internal Sends one message, in order after every message sent before it. */
  send(message: ClientMessage): void {
    this.outbound = this.outbound
      .then(async () => {
        const bytes = await pack(encode(message));
        if (this.socket.readyState === 1) this.socket.send(bytes);
      })
      .catch(() => undefined);
  }

  private emit(event: RoomEvent): void {
    for (const l of this.listeners) l(event);
  }

  private async receive(bytes: Uint8Array): Promise<void> {
    let text: string;
    try {
      text = await unpack(bytes, SERVER_FRAME_LIMIT);
    } catch {
      this.socket.close(4002, 'malformed');
      return;
    }
    const decoded = decodeServer(text);
    if (!decoded.ok) {
      if (decoded.refusal.refused === 'version') this.fail(new RelayError('version'));
      this.socket.close(
        decoded.refusal.refused === 'version' ? 4001 : 4002,
        decoded.refusal.refused,
      );
      return;
    }
    this.dispatch(decoded.message);
  }

  private dispatch(msg: ServerMessage): void {
    switch (msg.kind) {
      case 'joined':
        this.me = msg.id;
        break;
      case 'room':
        this.projection = msg.room;
        if (this.me !== null && this.entered) {
          this.entered.resolve();
          this.entered = null;
        }
        this.emit({ kind: 'room', room: msg.room });
        break;
      case 'error':
        if (this.entered) this.fail(new RelayError(msg.code));
        else
          this.emit(
            msg.detail === undefined
              ? { kind: 'refused', code: msg.code }
              : { kind: 'refused', code: msg.code, detail: msg.detail },
          );
        break;
      case 'view':
        if (this.relaySession) {
          this.relaySession.receiveView(msg);
        } else {
          this.relaySession = new RelaySession(this, msg);
          for (const w of this.waiting.splice(0)) w(this.relaySession);
        }
        break;
      case 'burst':
        this.relaySession?.receiveBurst(msg.frames as readonly BurstFrame[]);
        break;
      case 'result':
        this.relaySession?.receiveResult(msg);
        break;
    }
  }

  private fail(e: RelayError): void {
    if (!this.entered) return;
    this.entered.reject(e);
    this.entered = null;
  }

  private onClose(code: number): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.fail(new RelayError('closed', code));
    this.relaySession?.connectionClosed();
    this.emit({ kind: 'closed', code });
  }
}

export class RelaySession implements Session {
  readonly self: PlayerRef;
  private selection: Selection = NO_SELECTION;
  private latest: ViewMessage;
  private boundary: string;
  private cached: SessionView;
  private nextId = 1;
  private readonly pending = new Map<number, (outcome: ActionOutcome) => void>();
  private readonly listeners = new Set<Listener>();
  private disposed = false;
  private open = true;

  /** @internal Made by `RelayRoom` when the first view arrives. */
  constructor(
    private readonly relay: RelayRoom,
    first: ViewMessage,
  ) {
    this.self = relay.self;
    this.latest = first;
    this.boundary = boundaryOf(first.view);
    this.cached = this.build();
  }

  /** The room this game is being played in: its members, who is away, who is captain. */
  get room(): RelayRoom {
    return this.relay;
  }

  getView(): SessionView {
    return this.cached;
  }

  async sendAction(action: Record<string, unknown>): Promise<ActionOutcome> {
    if (this.disposed) throw new Error('RelaySession used after dispose()');
    if (!this.open) return { ok: false, error: 'disconnected' };
    const id = this.nextId;
    this.nextId += 1;
    // RESOLVED BY THE RESULT FOR THIS ID, which the relay sends after the view the action caused,
    // so a caller whose promise resolves already holds the new view, as with `LocalSession`.
    const outcome = new Promise<ActionOutcome>((resolve) => {
      this.pending.set(id, resolve);
    });
    this.relay.send({ kind: 'action', id, action });
    return outcome;
  }

  setSelection(selection: Selection): void {
    this.selection = selection;
    this.cached = this.build();
    this.emit({ kind: 'view', view: this.cached });
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** The relay holds the game; there is nothing on this device to save. See the header. */
  save(): Promise<void> {
    return Promise.resolve();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.relay.close();
  }

  /** @internal */
  receiveView(msg: ViewMessage): void {
    const boundary = boundaryOf(msg.view);
    if (boundary !== this.boundary) {
      this.boundary = boundary;
      this.selection = NO_SELECTION;
    }
    this.latest = msg;
    this.cached = this.build();
    this.emit({ kind: 'view', view: this.cached });
  }

  /** @internal */
  receiveBurst(frames: readonly BurstFrame[]): void {
    this.emit({ kind: 'burst', frames });
  }

  /** @internal */
  receiveResult(msg: ResultMessage): void {
    const resolve = this.pending.get(msg.id);
    if (!resolve) return;
    this.pending.delete(msg.id);
    if (msg.ok) {
      resolve({ ok: true });
      return;
    }
    // The ENGINE's refusal keeps its own text as `error`, exactly as `LocalSession` reports it;
    // a room's refusal is a code, carried as `code` for the catalogue and as `error` for callers
    // that read only that.
    const code = msg.code ?? 'engine';
    resolve({ ok: false, error: msg.detail ?? code, code });
  }

  /** @internal Nothing more will arrive: every action still waiting is answered, not abandoned. */
  connectionClosed(): void {
    this.open = false;
    for (const resolve of this.pending.values()) resolve({ ok: false, error: 'disconnected' });
    this.pending.clear();
  }

  private build(): SessionView {
    return {
      game: this.latest.view,
      selection: this.selection,
      queries: this.latest.queries as unknown as PrecomputedQueries,
      scoped: scopeFrom(this.latest.scoped as unknown as AllScoped, this.selection),
      undo: MULTIPLAYER_UNDO,
    };
  }

  private emit(event: SessionEvent): void {
    for (const l of this.listeners) l(event);
  }
}
