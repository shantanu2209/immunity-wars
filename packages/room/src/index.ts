/**
 * @immunity-wars/room — the room's rules (docs/PHASE3_BRIEF.md §5).
 *
 * Everything here is pure: `step` takes a room, a message and a timestamp, and returns the next
 * room with what to send. The platform adapter owns sockets, time and storage, and the relay's Node
 * adapter (`packages/server`) is one such adapter — the test suite is another, which is what makes
 * Gate B's portability claim checkable rather than aspirational.
 */
export { createRoom, project, step, sweep } from './room.js';
export {
  CELL_SEATS,
  GRACE_MS,
  ORGAN_SEATS,
  SEATS,
  type Inbound,
  type Member,
  type Message,
  type Outbound,
  type RoomPhase,
  type RoomProjection,
  type RoomState,
  type Step,
} from './types.js';
