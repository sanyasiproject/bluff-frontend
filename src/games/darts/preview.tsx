// Dev only (?dartsPreview=1, =finish, =over; &n=2..4, &start=301|501): Darts on a fake room with the real scoring and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import { dartScore, DART_NUMBERS, DART_RINGS, DARTS_PER_TURN, type DartsView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { DartsTable } from './DartsTable';

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

/** the turn has finished (3 darts, bust or checkout); the server moves on 1.6 s later */
const turnDone = (v: DartsView) => !!v.turnId && v.thrown.length > 0 && (v.thrown.length >= DARTS_PER_TURN || !!v.last?.bust || v.left[v.turnId] === 0);

function throwAt(v: DartsView, ax: number, ay: number): DartsView {
  const who = v.turnId;
  if (!who || turnDone(v)) return v;
  // no hand shake (DART_SHAKE 0 on the server): a dart lands where the sweep locked; bots add their own aim noise
  const x = ax;
  const y = ay;
  const s = dartScore(x, y);
  const before = v.left[who];
  const after = before - s.score;
  const bust = after < 0;
  const d = { seq: (v.last?.seq ?? 0) + 1, playerId: who, x, y, ...s, dart: v.thrown.length + 1, bust };
  const left = { ...v.left, [who]: bust ? v.turnStart : after };
  const places = { ...v.places };
  if (!bust && after === 0) places[who] = Object.keys(places).length + 1;
  return { ...v, left, places, thrown: [...v.thrown, d], last: d };
}

function nextTurn(v: DartsView, ids: string[]): DartsView {
  const still = ids.filter((id) => !v.places[id]);
  if (still.length <= 1) return { ...v, turnId: null, places: still[0] ? { ...v.places, [still[0]]: ids.length } : v.places };
  const at = ids.indexOf(v.turnId!);
  const next = [...ids.slice(at + 1), ...ids.slice(0, at + 1)].find((id) => !v.places[id])!;
  return { ...v, turnId: next, thrown: [], turnStart: v.left[next] };
}

/** where a bot aims: treble 20, or a finish on what's left */
function botAim(left: number): [number, number] {
  const at = (n: number, r: number): [number, number] => {
    const a = (DART_NUMBERS.indexOf(n as (typeof DART_NUMBERS)[number]) * 18 * Math.PI) / 180;
    return [Math.sin(a) * r, Math.cos(a) * r];
  };
  const mid = (DART_RINGS.trebleIn + DART_RINGS.trebleOut) / 2;
  if (left === 50) return [0, 0];
  if (left <= 20) return at(left, 0.4);
  if (left <= 40 && left % 2 === 0) return at(left / 2, (DART_RINGS.doubleIn + 1) / 2);
  if (left <= 60 && left % 3 === 0) return at(left / 3, mid);
  if (left < 60) return at(Math.min(20, left - 20 > 0 ? left - 20 : left), 0.4);
  return at(20, mid);
}

export function DartsPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('dartsPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const start = q.get('start') === '501' ? 501 : 301;
  const [v, setV] = useState<DartsView>(() => {
    const left = Object.fromEntries(ids.map((id, i) => [id, mode === 'finish' ? [40, 57, 120, 88][i] : start]));
    const s: DartsView = { start, left, turnId: 'me', thrown: [], turnStart: left.me, last: null, places: {} };
    if (mode !== 'over') return s;
    return { ...s, turnId: null, left: Object.fromEntries(ids.map((id, i) => [id, i === 0 ? 0 : i * 37])), places: Object.fromEntries(ids.map((id, i) => [id, i + 1])) };
  });
  const ref = useRef(v);
  ref.current = v;

  // the fake server: after a finished turn wait 1.6 s, bots throw 1.1–1.8 s apart
  useEffect(() => {
    if (!v.turnId) return;
    if (turnDone(v)) {
      const t = window.setTimeout(() => setV((s) => nextTurn(s, ids)), 1600);
      return () => window.clearTimeout(t);
    }
    if (v.turnId === 'me') return;
    const t = window.setTimeout(() => {
      setV((s) => {
        const [ax, ay] = botAim(s.left[s.turnId!]);
        return throwAt(s, ax + gauss() * 0.14, ay + gauss() * 0.14);
      });
    }, 1100 + Math.random() * 700);
    return () => window.clearTimeout(t);
  }, [v.last?.seq, v.turnId, v.thrown.length]);

  const over = !v.turnId;
  const view = useMemo(() => fakeView('darts', { start }, n, { kind: 'darts', darts: v }, over, ids.filter((id) => v.places[id] === 1), 30_000), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        if (m.kind !== 'darts' || ref.current.turnId !== 'me' || turnDone(ref.current)) return false;
        setV((s) => throwAt(s, m.move.x, m.move.y));
        return true;
      }),
    [],
  );
  return <DartsTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
