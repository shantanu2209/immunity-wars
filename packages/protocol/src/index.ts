/**
 * @immunity-wars/protocol — the messages client and relay exchange, and the only functions that
 * read them off the wire (docs/PHASE3_BRIEF.md §3, P3.2).
 *
 * Zod at the trust boundary, which a relay is the largest instance of this project has had: every
 * message is decoded here, the versions are checked before anything else, and every message is
 * written by `encode`, which stamps them. Depends on the content pack for `RULES_VERSION` and on
 * nothing that implements anything (`protocol-no-implementations`).
 */
export const PACKAGE_NAME = '@immunity-wars/protocol';

export {
  CELL_SEATS,
  ERROR_CODES,
  ORGAN_SEATS,
  PROTOCOL_VERSION,
  RULES_VERSION,
  SEATS,
  pidOf,
  residentSeat,
  type ErrorCode,
  type Seat,
} from './vocabulary.js';

export { CLIENT_FRAME_LIMIT, SERVER_FRAME_LIMIT, pack, unpack } from './frame.js';

export {
  RoomProjectionSchema,
  decodeClient,
  decodeServer,
  encode,
  type ClientMessage,
  type Decoded,
  type MalformedRefusal,
  type RoomProjection,
  type ServerMessage,
  type VersionRefusal,
} from './messages.js';
