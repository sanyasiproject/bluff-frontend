// Dev only (?bombPreview=1|boom|over&n=2..4&task=sum|bigger|colour|odd|count|arrow): Bomb Pass on a fake room with a hidden fuse and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PluggedView } from '../../types';
import type { BombInk, BombTask, BombView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { BombTable } from './BombTable';

const KINDS = ['sum', 'bigger', 'colour', 'odd', 'count', 'arrow'] as const;
const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
let tid = 0;

function makeTask(force?: string | null): { task: BombTask; right: number } {
  const kind = (force && (KINDS as readonly string[]).includes(force) ? force : KINDS[Math.floor(Math.random() * KINDS.length)]) as BombTask['kind'];
  const id = ++tid;
  const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (answer: string, others: string[]) => {
    const choices = shuffle([answer, ...others]);
    return { choices, right: choices.indexOf(answer) };
  };
  if (kind === 'sum') {
    const a = rnd(3, 14);
    const b = rnd(2, 9);
    const r = a + b;
    const p = pick(String(r), [String(r - 1), String(r + 1), String(r + 2)]);
    return { task: { id, kind, prompt: `${a} + ${b}`, choices: p.choices }, right: p.right };
  }
  if (kind === 'bigger') {
    const a = rnd(10, 99);
    const b = a + rnd(1, 9) * (Math.random() < 0.5 ? -1 : 1);
    const p = pick(String(Math.max(a, b)), [String(Math.min(a, b))]);
    return { task: { id, kind, prompt: 'Tap the bigger number', choices: p.choices }, right: p.right };
  }
  if (kind === 'colour') {
    const cols = shuffle<BombInk>(['red', 'blue', 'green', 'yellow']);
    const p = pick(cols[0], cols.slice(1));
    return { task: { id, kind, prompt: 'Tap the colour of the ink', word: cols[1].toUpperCase(), ink: cols[0], choices: p.choices }, right: p.right };
  }
  if (kind === 'odd') {
    const sets = [['🍎', '🍌'], ['🐶', '🐱'], ['🚗', '✈️'], ['⚽', '🍕']];
    const [same, odd] = shuffle(sets[rnd(0, 3)]);
    const p = pick(odd, [same, same, same]);
    return { task: { id, kind, prompt: 'Tap the odd one out', choices: p.choices }, right: p.right };
  }
  if (kind === 'count') {
    const d = rnd(3, 9);
    const dots: [number, number][] = [];
    for (let t = 0; dots.length < d && t < 500; t++) {
      const q: [number, number] = [0.12 + Math.random() * 0.76, 0.12 + Math.random() * 0.76];
      if (dots.every(([x, y]) => (x - q[0]) ** 2 + (y - q[1]) ** 2 > 0.17 * 0.17)) dots.push(q);
    }
    const p = pick(String(dots.length), [String(dots.length - 1), String(dots.length + 1), String(dots.length + 2)]);
    return { task: { id, kind, prompt: 'How many dots?', dots, choices: p.choices }, right: p.right };
  }
  const dirs = ['up', 'right', 'down', 'left'] as const;
  const d = dirs[rnd(0, 3)];
  return { task: { id, kind, prompt: 'Swipe the way it points', arrow: d, choices: [...dirs] }, right: dirs.indexOf(d) };
}

export function BombPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('bombPreview') ?? '1';
  const force = q.get('task');
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const right = useRef(0);
  const fuse = useRef(Date.now() + 15000);
  const lit = useRef(Date.now());
  const [v, setV] = useState<BombView>(() => {
    const t = makeTask(force);
    right.current = t.right;
    const s: BombView = {
      phase: mode === 'count' ? 'countdown' : 'play', startsAt: Date.now() + 3000, round: 1, speed: 'normal', maxHearts: 3, hearts: Object.fromEntries(ids.map((id) => [id, 3])),
      holder: 'me', heat: 0, task: t.task, shakeUntil: 0, lastPass: null, lastBoom: null, nextAt: null, places: {}, now: Date.now(),
    };
    if (mode === 'over') return { ...s, phase: 'over', holder: null, task: null, hearts: Object.fromEntries(ids.map((id, i) => [id, i ? 0 : 2])), places: Object.fromEntries(ids.map((id, i) => [id, i + 1])) };
    return s;
  });
  const ref = useRef(v);
  ref.current = v;
  const alive = (s: BombView, id: string) => (s.hearts[id] ?? 0) > 0;
  const nextAlive = (s: BombView, id: string) => {
    const i = ids.indexOf(id);
    return [...ids.slice(i + 1), ...ids.slice(0, i + 1)].find((x) => alive(s, x))!;
  };
  const newTask = () => {
    const t = makeTask(force);
    right.current = t.right;
    return t.task;
  };
  const pass = (s: BombView): BombView => {
    const to = nextAlive(s, s.holder!);
    return { ...s, holder: to, task: newTask(), lastPass: { from: s.holder!, to, at: Date.now(), ms: 1200 + Math.random() * 1500 }, now: Date.now() };
  };

  // the hidden fuse and heat
  useEffect(() => {
    if (mode === 'over') return;
    if (mode === 'count') window.setTimeout(() => setV((x) => ({ ...x, phase: 'play', now: Date.now() })), 3000);
    if (mode === 'boom') fuse.current = Date.now() + 2500;
    const t = window.setInterval(() => {
      const s = ref.current;
      if (s.phase !== 'play' || !s.holder) return;
      const left = (fuse.current - Date.now()) / (fuse.current - lit.current);
      const heat = (left > 0.3 ? 0 : left > 0.2 ? 1 : left > 0.1 ? 2 : 3) as BombView['heat'];
      if (Date.now() < fuse.current) {
        if (heat !== s.heat) setV({ ...s, heat });
        return;
      }
      const who = s.holder;
      const hearts = { ...s.hearts, [who]: s.hearts[who] - 1 };
      const still = ids.filter((id) => hearts[id] > 0);
      const places = { ...s.places };
      if (hearts[who] <= 0) places[who] = still.length + 1;
      if (still.length === 1) places[still[0]] = 1;
      setV({ ...s, hearts, places, phase: still.length > 1 ? 'boom' : 'over', task: null, heat: 0, lastBoom: { playerId: who, at: Date.now(), out: hearts[who] <= 0 }, holder: null, nextAt: Date.now() + 3000, now: Date.now() });
      if (still.length > 1)
        window.setTimeout(() => {
          lit.current = Date.now();
          fuse.current = Date.now() + 8000 + Math.random() * 12000;
          const s2 = ref.current;
          setV({ ...s2, phase: 'play', round: s2.round + 1, holder: nextAlive(s2, who), task: newTask(), nextAt: null, now: Date.now() });
        }, 3000);
    }, 200);
    return () => window.clearInterval(t);
  }, []);

  // bots answer after a delay, sometimes wrong
  useEffect(() => {
    if (v.phase !== 'play' || !v.holder || v.holder === 'me') return;
    const t = window.setTimeout(() => {
      const s = ref.current;
      if (s.phase !== 'play' || s.holder === 'me') return;
      if (Math.random() < 0.15) {
        setV({ ...s, shakeUntil: Date.now() + 800, now: Date.now() });
        window.setTimeout(() => setV((x) => ({ ...x, task: newTask(), now: Date.now() })), 800);
      }
      else setV(pass(s));
    }, 1600 + Math.random() * 1600);
    return () => window.clearTimeout(t);
  }, [v.holder, v.task?.id, v.phase]);

  const over = v.phase === 'over';
  const view = useMemo(() => fakeView('bomb', { hearts: 3, speed: 'normal' }, n, { kind: 'bomb', bomb: v } as unknown as PluggedView, over, ids.filter((id) => v.places[id] === 1)), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        const mv = m as unknown as { kind: string; move: { task: number; choice: number } };
        const s = ref.current;
        if (mv.kind !== 'bomb' || s.holder !== 'me' || s.task?.id !== mv.move.task) return false;
        if (mv.move.choice === right.current) {
          setV(pass(s));
          return true;
        }
        setV({ ...s, shakeUntil: Date.now() + 800, now: Date.now() });
        window.setTimeout(() => setV((x) => (x.holder === 'me' ? { ...x, task: newTask(), now: Date.now() } : x)), 800);
        return true;
      }),
    [],
  );
  return <BombTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
