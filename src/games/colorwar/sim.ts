// Colour Wars on the phone: replays a tap wave by wave (as the server did) so bursts can be animated, and the preview's rules
import { COLORWAR_BURST, COLORWAR_FIRST, type ColorWarCell } from '../../types';

export const WAVE_MS = 380;

export function neighbours(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

export interface Frame {
  /** the board just before this wave's blobs land (burst cells emptied) */
  mid: ColorWarCell[];
  /** after the wave */
  after: ColorWarCell[];
  /** blobs flying out: from cell → to cell */
  fly: [number, number][];
}

/** the tap itself, then each wave from the server's list */
export function replay(size: number, before: ColorWarCell[], who: string, cell: number, first: boolean, waves: number[][]): { tapped: ColorWarCell[]; frames: Frame[] } {
  const cells = before.map((c) => ({ ...c }));
  if (first) cells[cell] = { owner: who, dots: COLORWAR_FIRST };
  else cells[cell] = { owner: who, dots: cells[cell].dots + 1 };
  const tapped = cells.map((c) => ({ ...c }));
  const frames: Frame[] = [];
  for (const wave of waves) {
    for (const i of wave) cells[i] = { owner: null, dots: 0 };
    const mid = cells.map((c) => ({ ...c }));
    const fly: [number, number][] = [];
    for (const i of wave)
      for (const j of neighbours(size, i)) {
        cells[j] = { owner: who, dots: cells[j].dots + 1 };
        fly.push([i, j]);
      }
    frames.push({ mid, after: cells.map((c) => ({ ...c })), fly });
  }
  return { tapped, frames };
}

/** the full rule for the preview: tap, then burst until stable or no rival is left */
export function applyTap(size: number, cells: ColorWarCell[], who: string, cell: number, first: boolean, rivalsWaiting: boolean): number[][] {
  if (first) cells[cell] = { owner: who, dots: COLORWAR_FIRST };
  else cells[cell].dots++;
  const waves: number[][] = [];
  const rivalsLeft = () => rivalsWaiting || cells.some((c) => c.owner !== null && c.owner !== who);
  while (waves.length < 200 && rivalsLeft()) {
    const wave = cells.flatMap((c, i) => (c.dots >= COLORWAR_BURST ? [i] : []));
    if (wave.length === 0) break;
    waves.push(wave);
    for (const i of wave) cells[i] = { owner: null, dots: 0 };
    for (const i of wave)
      for (const j of neighbours(size, i)) {
        cells[j].owner = who;
        cells[j].dots++;
      }
  }
  return waves;
}
