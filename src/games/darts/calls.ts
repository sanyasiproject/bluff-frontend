// What the caller shouts for a dart, and a simple checkout hint for the points left
import type { DartThrow } from '../../types';

/** the caller's shout: big words for the big rings */
export function bigCall(d: Pick<DartThrow, 'ring' | 'number' | 'score'>): { text: string; tone: 'gold' | 'good' | 'red' | 'plain' } {
  if (d.ring === 'bull') return { text: 'BULL!', tone: 'gold' };
  if (d.ring === 'outerBull') return { text: '25!', tone: 'good' };
  if (d.ring === 'miss') return { text: 'MISS', tone: 'red' };
  if (d.ring === 'treble') return { text: `TREBLE ${d.number}!`, tone: 'gold' };
  if (d.ring === 'double') return { text: `DOUBLE ${d.number}!`, tone: 'good' };
  return { text: `${d.score}`, tone: 'plain' };
}

/** one dart that scores exactly v, as a board call */
function oneDart(v: number): string | null {
  if (v === 50) return 'Bull';
  if (v === 25) return '25';
  if (v >= 1 && v <= 20) return `${v}`;
  if (v <= 60 && v % 3 === 0 && v > 0) return `T${v / 3}`;
  if (v <= 40 && v % 2 === 0 && v > 0) return `D${v / 2}`;
  return null;
}

/** a short hint when a finish is in sight (170 or less): the dart to aim for now, and what it leaves */
export function checkoutHint(left: number): string | null {
  if (left <= 0 || left > 170) return null;
  const now = oneDart(left);
  if (now) return `Finish on ${now}`;
  // the biggest treble (then double, then single) that leaves a one-dart finish
  for (const [m, tag] of [[3, 'T'], [2, 'D'], [1, '']] as const) {
    for (let n = 20; n >= 1; n--) {
      const rest = left - n * m;
      const next = rest > 0 ? oneDart(rest) : null;
      if (next) return `${tag}${n} · ${next}`;
    }
  }
  if (left - 50 > 0 && oneDart(left - 50)) return `Bull · ${oneDart(left - 50)}`;
  return `T20 · leaves ${left - 60}`;
}
