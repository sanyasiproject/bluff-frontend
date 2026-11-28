// Dev only (?seaPreview=1|battle|over&n=2..4&powers=off): Sea Battle on a fake room (hidden fleets kept here, per-player views), bots fire at random
import { useEffect, useMemo, useRef, useState } from 'react';
import { seaRandomFleet, seaShipCells, SEA_POWERS, SEA_SIZE, type PluggedView, type SeaMoveInput, type SeaPower, type SeaShip, type SeaShotView, type SeaView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { SeaTable } from './SeaTable';

interface World {
  phase: SeaView['phase'];
  fleets: Record<string, SeaShip[]>;
  shots: Record<string, number[]>;
  ready: Record<string, boolean>;
  turn: string | null;
  held: Record<string, SeaPower[]>;
  radars: SeaView['radars'];
  last: SeaShotView | null;
  places: Record<string, number>;
}

const shipAt = (w: World, id: string, x: number, y: number) => w.fleets[id].find((s) => seaShipCells(s).some(([a, b]) => a === x && b === y));
const sunkShip = (w: World, id: string, s: SeaShip) => seaShipCells(s).every(([x, y]) => w.shots[id][y * SEA_SIZE + x] >= 2);

function fire(w: World, ids: string[], by: string, m: SeaMoveInput, powers: boolean): World {
  if (m.type === 'place' || m.type === 'ready') return w;
  const t = m.target;
  const shots = { ...w.shots, [t]: [...w.shots[t]] };
  const nw = { ...w, shots };
  const cells: SeaShotView['cells'] = [];
  const hitCell = (x: number, y: number) => {
    const s = shipAt(nw, t, x, y);
    shots[t][y * SEA_SIZE + x] = s ? 2 : 1;
    const sunk = !!s && sunkShip(nw, t, s);
    if (s && sunk) seaShipCells(s).forEach(([a, b]) => (shots[t][b * SEA_SIZE + a] = 3));
    cells.push({ x, y, hit: !!s, sunk });
  };
  let held = w.held[by] ?? [];
  if (m.type !== 'fire') held = held.filter((p, i) => p !== m.type || held.indexOf(p) !== i);
  let area: [number, number] | undefined;
  let count: number | undefined;
  if (m.type === 'fire') hitCell(m.x, m.y);
  if (m.type === 'salvo') m.cells.forEach(([x, y]) => hitCell(x, y));
  if (m.type === 'torpedo') {
    const x = Array.from({ length: SEA_SIZE }, (_, i) => i).find((i) => shipAt(nw, t, i, m.row) && shots[t][m.row * SEA_SIZE + i] < 2);
    if (x !== undefined) hitCell(x, m.row);
  }
  if (m.type === 'radar') {
    area = [Math.max(0, Math.min(SEA_SIZE - 3, m.x - 1)), Math.max(0, Math.min(SEA_SIZE - 3, m.y - 1))];
    count = 0;
    for (let y = area[1]; y < area[1] + 3; y++) for (let x = area[0]; x < area[0] + 3; x++) if (shipAt(nw, t, x, y) && shots[t][y * SEA_SIZE + x] < 2) count++;
  }
  const sunkAny = cells.some((c) => c.sunk);
  const earned = powers && sunkAny && held.length < 2 ? SEA_POWERS[Math.floor(Math.random() * 3)] : null;
  if (earned) held = [...held, earned];
  const out = w.fleets[t].every((s) => sunkShip(nw, t, s));
  const places = { ...w.places };
  if (out) places[t] = ids.filter((id) => !places[id]).length;
  const left = ids.filter((id) => !places[id]);
  if (left.length === 1) places[left[0]] = 1;
  const again = m.type === 'radar' || cells.some((c) => c.hit);
  const next = left.length <= 1 ? null : again ? by : left[(left.indexOf(by) + 1) % left.length] ?? left[0];
  const radars = m.type === 'radar' && by === 'me' ? [...w.radars, { target: t, x: area![0], y: area![1], count: count! }] : w.radars;
  const last: SeaShotView = { seq: (w.last?.seq ?? 0) + 1, by, target: t, kind: m.type, cells, row: m.type === 'torpedo' ? m.row : undefined, area, count: by === 'me' ? count : undefined, earned, again, out, auto: false };
  return { ...nw, held: { ...w.held, [by]: held }, radars, last, places, turn: next, phase: next ? 'battle' : 'over' };
}

function viewOf(w: World, ids: string[], powers: boolean): SeaView {
  const seas = Object.fromEntries(ids.map((id) => {
    const ships = w.fleets[id].map((s) => ({ ...s, sunk: sunkShip(w, id, s), hits: seaShipCells(s).filter(([x, y]) => w.shots[id][y * SEA_SIZE + x] >= 2).length }));
    return [id, { shots: w.shots[id], ships: id === 'me' ? ships : ships.filter((s) => s.sunk), afloat: ships.filter((s) => !s.sunk).map((s) => s.len) }];
  }));
  return { phase: w.phase, powers, placeEndsAt: Date.now() + 45_000, ready: w.ready, seas, turnId: w.turn, deadline: w.turn ? Date.now() + 20_000 : null, held: w.held, radars: w.radars, last: w.last, places: w.places, now: Date.now() };
}

export function SeaPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('seaPreview') ?? '1';
  const powers = q.get('powers') !== 'off';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const [w, setW] = useState<World>(() => {
    const s: World = {
      phase: mode === '1' ? 'place' : 'battle', fleets: Object.fromEntries(ids.map((id) => [id, seaRandomFleet()])), shots: Object.fromEntries(ids.map((id) => [id, new Array(SEA_SIZE * SEA_SIZE).fill(0)])),
      ready: Object.fromEntries(ids.map((id) => [id, id !== 'me'])), turn: mode === '1' ? null : 'me', held: Object.fromEntries(ids.map((id) => [id, mode === '1' ? [] : (['radar', 'salvo'] as SeaPower[])])), radars: [], last: null, places: {},
    };
    if (mode === 'over') return { ...s, phase: 'over', turn: null, places: Object.fromEntries(ids.map((id, i) => [id, i + 1])) };
    return s;
  });
  const ref = useRef(w);
  ref.current = w;

  // bots fire at a random unshot cell of a random live foe
  useEffect(() => {
    if (w.phase !== 'battle' || !w.turn || w.turn === 'me') return;
    const t = window.setTimeout(() => {
      const s = ref.current;
      const by = s.turn!;
      const foes = ids.filter((id) => id !== by && !s.places[id]);
      const tg = foes[Math.floor(Math.random() * foes.length)];
      const free = s.shots[tg].map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      const c = free[Math.floor(Math.random() * free.length)];
      setW(fire(s, ids, by, { type: 'fire', target: tg, x: c % SEA_SIZE, y: Math.floor(c / SEA_SIZE) }, powers));
    }, 1400);
    return () => window.clearTimeout(t);
  }, [w.last?.seq, w.turn, w.phase]);

  const view = useMemo(() => fakeView('seabattle', { powers: powers ? 'on' : 'off' }, n, { kind: 'seabattle', seabattle: viewOf(w, ids, powers) } as unknown as PluggedView, w.phase === 'over', ids.filter((id) => w.places[id] === 1)), [w]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        const mv = m as unknown as { kind: string; move: SeaMoveInput };
        if (mv.kind !== 'seabattle') return false;
        const s = ref.current;
        if (mv.move.type === 'place') setW({ ...s, fleets: { ...s.fleets, me: mv.move.ships ?? seaRandomFleet() } });
        else if (mv.move.type === 'ready') setW((x) => ({ ...x, ready: { ...x.ready, me: true }, phase: 'battle', turn: 'me' }));
        else if (s.turn === 'me') setW(fire(s, ids, 'me', mv.move, powers));
        else return false;
        return true;
      }),
    [],
  );
  return <SeaTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
