/**
 * @immunity-wars/ui
 *
 * React components. First real occupant: the P2.2 board — an SVG derived at render time from
 * `geometry.json` through content's validated loader, taking a plain `ViewState` so the same
 * component renders authoritative views and burst frames alike.
 */

export const PACKAGE_NAME = '@immunity-wars/ui';

export { Board } from './board/Board';
export * as boardGeometry from './board/geometry';
