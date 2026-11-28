// Dev only (?wordhuntPreview=1|play|reveal|over&n=2..4&grid=4|5&time=sec): Word Grid Hunt on a fake room, a tiny word list and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import { wordHuntMinLen, wordHuntPoints, wordHuntTouches, wordHuntWordOf, type WordHuntRevealWord, type WordHuntView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { WordHuntTable } from './WordHuntTable';

const GRIDS: Record<number, string[][]> = {
  4: [
    ['s', 't', 'a', 'r', 'e', 'a', 't', 'n', 'l', 'i', 'o', 'p', 'd', 'n', 'e', 's'],
    ['c', 'a', 'r', 't', 'o', 'l', 'e', 's', 'm', 'i', 'n', 'd', 'qu', 'e', 's', 't'],
    ['p', 'l', 'a', 'n', 'e', 't', 'r', 'o', 's', 'h', 'i', 'p', 'd', 'e', 'a', 'l'],
  ],
  5: [['s', 't', 'a', 'r', 'e', 'p', 'l', 'a', 'n', 't', 'r', 'o', 'u', 'n', 'd', 'e', 'a', 't', 'e', 's', 'm', 'i', 'n', 'd', 's']],
};
// a small dev word list (common words only; the real dictionary lives on the server)
const WORDS = 'star stare stares tar tea teas eat eats seat sea set sat rat rate rates art arts tan ant ants note notes tone tones stone stones nest pen pens open opens dine dines line lines lion lions tail tails rain rains nail toil soil spin pins pine pines cart carts care cares car cars role roles sole hole holes mind minds quest quests quote test tests lean plan plane planet planets lane net nets ten tens rot trot shop ship hip hips deal deals lead heal head sand land plant plants round rounds sound under tend eaten stamp meant mean dent dents trap traps part parts sport sports torn horn'.split(' ');

function solve(grid: string[], size: number, min: number): string[] {
  const out = new Set<string>();
  const words = new Set(WORDS.filter((w) => w.length >= min));
  const prefixes = new Set(WORDS.flatMap((w) => [...Array(w.length).keys()].map((i) => w.slice(0, i + 1))));
  const go = (path: number[]) => {
    const w = wordHuntWordOf(grid, path);
    if (!prefixes.has(w)) return;
    if (words.has(w)) out.add(w);
    for (let t = 0; t < grid.length; t++) if (!path.includes(t) && wordHuntTouches(size, path[path.length - 1], t)) go([...path, t]);
  };
  for (let t = 0; t < grid.length; t++) go([t]);
  return [...out];
}

interface World { v: WordHuntView; real: string[]; found: Record<string, string[]>; all: string[]; seq: number }

function roundOf(round: number, size: 4 | 5, sec: number, ids: string[], scores: Record<string, number>, phase: WordHuntView['phase']): World {
  const real = GRIDS[size][(round - 1) % GRIDS[size].length];
  const now = Date.now();
  const startsAt = phase === 'countdown' ? now + 3000 : now - 1000;
  const minLen = wordHuntMinLen(size);
  return {
    v: { size, minLen, time: sec, grid: phase === 'countdown' ? [] : real, round, rounds: 3, phase, startsAt, endsAt: startsAt + sec * 1000, nextAt: null, mine: [], lastTry: null, counts: Object.fromEntries(ids.map((id) => [id, 0])), reveal: null, scores, places: {}, now },
    real, found: Object.fromEntries(ids.map((id) => [id, []])), all: solve(real, size, minLen), seq: 0,
  };
}

function reveal(w: World, ids: string[]): World {
  const by = (word: string) => ids.filter((id) => w.found[id].includes(word)).length;
  const words: Record<string, WordHuntRevealWord[]> = Object.fromEntries(ids.map((id) => [id, w.found[id].map((word) => ({ word, unique: by(word) === 1, points: wordHuntPoints(word.length) * (by(word) === 1 ? 2 : 1) }))]));
  const points = Object.fromEntries(ids.map((id) => [id, words[id].reduce((a, x) => a + x.points, 0)]));
  const scores = Object.fromEntries(ids.map((id) => [id, (w.v.scores[id] ?? 0) + points[id]]));
  const flat = ids.flatMap((id) => words[id].map((x) => ({ ...x, playerId: id })));
  const best = flat.sort((a, b) => b.word.length - a.word.length || b.points - a.points)[0];
  const missed = w.all.filter((x) => by(x) === 0).sort((a, b) => b.length - a.length).slice(0, 5);
  const now = Date.now();
  return { ...w, v: { ...w.v, phase: 'reveal', now, nextAt: now + 12000, scores, reveal: { round: w.v.round, grid: w.real, words, points, best: best ? { playerId: best.playerId, word: best.word, points: best.points } : null, missed, total: w.all.length } } };
}

function finish(w: World, ids: string[]): World {
  const s = w.v.scores;
  return { ...w, v: { ...w.v, phase: 'over', places: Object.fromEntries(ids.map((id) => [id, 1 + ids.filter((o) => s[o] > s[id]).length])) } };
}

export function WordHuntPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('wordhuntPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const size = q.get('grid') === '5' ? 5 : 4;
  const sec = Number(q.get('time')) || 120;
  const zero = Object.fromEntries(ids.map((id) => [id, 0]));
  const [w, setW] = useState<World>(() => {
    const start = roundOf(mode === 'over' ? 3 : 1, size, sec, ids, zero, mode === '1' ? 'countdown' : 'play');
    if (mode !== 'reveal' && mode !== 'over') return start;
    const found = Object.fromEntries(ids.map((id, i) => [id, start.all.filter((_, k) => k % (i + 2) === 0)]));
    const r = reveal({ ...start, found }, ids);
    // over: the last reveal moves to game over after a moment
    return mode === 'over' ? { ...r, v: { ...r.v, nextAt: Date.now() + 1500 } } : r;
  });
  const ref = useRef(w);
  ref.current = w;

  // the round clock: countdown → play → reveal → next round
  useEffect(() => {
    const t = window.setInterval(() => {
      const v = ref.current.v;
      const now = Date.now();
      if (v.phase === 'countdown' && now >= v.startsAt) setW((s) => ({ ...s, v: { ...s.v, phase: 'play', grid: s.real, now } }));
      if (v.phase === 'play' && now >= v.endsAt) setW((s) => reveal(s, ids));
      if (v.phase === 'reveal' && v.nextAt && now >= v.nextAt) setW((s) => (s.v.round >= 3 ? finish(s, ids) : roundOf(s.v.round + 1, size, sec, ids, s.v.scores, 'countdown')));
    }, 250);
    return () => window.clearInterval(t);
  }, []);

  // bots find a word every few seconds
  useEffect(() => {
    if (w.v.phase !== 'play') return;
    const t = window.setInterval(() => {
      setW((s) => {
        const id = ids[1 + Math.floor(Math.random() * (ids.length - 1))];
        const word = s.all.find((x) => !s.found[id].includes(x) && Math.random() < 0.3);
        if (!word || s.v.phase !== 'play') return s;
        const found = { ...s.found, [id]: [...s.found[id], word] };
        return { ...s, found, v: { ...s.v, counts: { ...s.v.counts, [id]: found[id].length } } };
      });
    }, 2500);
    return () => window.clearInterval(t);
  }, [w.v.phase, w.v.round]);

  const winners = (() => {
    const top = Math.max(...ids.map((id) => w.v.scores[id]));
    return ids.filter((id) => w.v.scores[id] === top);
  })();
  const view = useMemo(() => fakeView('wordhunt', { grid: size, time: sec }, n, { kind: 'wordhunt', wordhunt: w.v }, w.v.phase === 'over', winners), [w]);
  // the word move goes through gameMoveQuiet; the verdict comes back in lastTry
  const actions = useMemo(() => {
    const base = fakeActions(() => false);
    const send = async (m: { kind: string; move: unknown }) => {
      const s = ref.current;
      const mv = m.move as { path: number[]; round: number };
      if (m.kind !== 'wordhunt' || s.v.phase !== 'play') return false;
      const word = wordHuntWordOf(s.real, mv.path);
      const ok = s.all.includes(word) && !s.found.me.includes(word);
      const points = ok ? wordHuntPoints(word.length) : 0;
      setW((x) => {
        const found = ok ? { ...x.found, me: [...x.found.me, word] } : x.found;
        const lastTry = { seq: x.seq + 1, word, path: mv.path, verdict: ok ? ('ok' as const) : ('unknown' as const), points };
        return { ...x, seq: x.seq + 1, found, v: { ...x.v, lastTry, mine: ok ? [...x.v.mine, { word, points }] : x.v.mine, counts: { ...x.v.counts, me: found.me.length } } };
      });
      return true;
    };
    return new Proxy(base, { get: (t, k) => (k === 'gameMoveQuiet' || k === 'gameMove' ? send : t[k as keyof typeof t]) });
  }, []);
  return <WordHuntTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
