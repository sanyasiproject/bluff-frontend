import { useEffect, useRef, useState } from 'react';
import { ENTRY_MS, makeBurst, WIN_MS } from '../lib/fx/bursts';
import { animate, fitCanvas } from '../lib/fx/engine';
import { reducedMotion } from '../lib/motion';
import { sfx } from '../lib/sounds';
import type { RoomView } from '../types';

/** one effect on screen: a winner's burst or a player's entry flash */
interface Fx {
  key: number;
  kind: 'win' | 'entry';
  /** shop item id, e.g. 'win-fireworks' */
  id: string;
  label: string;
  /** member id whose seat it lands on, when there is one */
  at: string | null;
  /** played from the shop: shown above every page */
  preview?: boolean;
}

/** reduced motion: just the label, briefly */
const QUIET_MS = 1400;

// the shop page plays effects here as a preview
type Listener = (fx: Omit<Fx, 'key'>) => void;
const listeners = new Set<Listener>();
export function previewShopFx(id: string, label: string) {
  const kind = id.startsWith('win-') ? 'win' : 'entry';
  listeners.forEach((l) => l({ kind, id, label, at: null, preview: true }));
}

/** shop win bursts and entry flashes everyone in the room sees; mounted once in App */
export function ShopFx({ view }: { view: RoomView | null }) {
  const [queue, setQueue] = useState<Fx[]>([]);
  const seq = useRef(0);
  // seated ids last seen, per room and per me; null until the first look (no flash on joining)
  const seen = useRef<{ room: string; me: string; ids: Set<string> } | null>(null);
  const lastPhase = useRef<string | null>(null);

  const push = (fx: Omit<Fx, 'key'>) => setQueue((q) => [...q, { ...fx, key: ++seq.current }]);

  useEffect(() => {
    listeners.add(push);
    return () => void listeners.delete(push);
  }, []);

  // entries: a seated player who wasn't here a moment ago and wears an entry flash
  const players = view?.players;
  useEffect(() => {
    if (!view || !players) {
      seen.current = null;
      return;
    }
    const ids = new Set(players.map((p) => p.id));
    const before = seen.current;
    seen.current = { room: view.code, me: view.meId, ids };
    if (!before || before.room !== view.code || before.me !== view.meId) return;
    for (const p of players) {
      if (before.ids.has(p.id) || p.id === view.meId || !p.shop?.entry) continue;
      push({ kind: 'entry', id: p.shop.entry, label: `${p.shop.entry === 'entry-thunder' ? '⚡' : '🔦'} ${p.name} joined`, at: p.id });
    }
  }, [players]);

  // win: once, when this game turns over in front of me, for the first winner wearing a burst
  const phase = view?.phase ?? null;
  useEffect(() => {
    const was = lastPhase.current;
    lastPhase.current = phase;
    if (!view || phase !== 'over' || was === null || was === 'over' || view.stopped) return;
    const winner = view.winnerIds.map((id) => view.players.find((p) => p.id === id)).find((p) => p?.shop?.win);
    if (!winner?.shop?.win) return;
    const emoji = winner.shop.win === 'win-goldrain' ? '💰' : winner.shop.win === 'win-thunder' ? '⚡' : '🎆';
    push({ kind: 'win', id: winner.shop.win, label: `${emoji} ${winner.id === view.meId ? 'Your' : `${winner.name}'s`} win`, at: winner.id === view.meId ? null : winner.id });
  }, [phase]);

  const current = queue[0];
  const next = () => setQueue((q) => q.slice(1));
  if (!current) return null;
  return <FxRun key={current.key} fx={current} onDone={next} />;
}

/** plays one effect on a full-screen canvas, then calls onDone */
function FxRun({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const quiet = reducedMotion();
  const ms = quiet ? QUIET_MS : fx.kind === 'win' ? WIN_MS : ENTRY_MS;
  useEffect(() => {
    if (fx.id.endsWith('thunder')) sfx.seven();
    else if (fx.kind === 'entry') sfx.friendOnline();
    const done = window.setTimeout(onDone, ms + 900);
    const canvas = ref.current;
    if (quiet || !canvas) return () => window.clearTimeout(done);
    const w = window.innerWidth;
    const h = window.innerHeight;
    // land on the player's seat when it's on screen, else where the label is
    const seat = fx.at ? document.querySelector(`[data-member="${CSS.escape(fx.at)}"]`)?.getBoundingClientRect() : null;
    const target = seat && seat.width > 0 ? { x: seat.left + seat.width / 2, y: seat.top + seat.height / 2 } : { x: w / 2, y: h * (fx.kind === 'win' ? 0.24 : 0.32) };
    const burst = makeBurst(fx.id, w, h, target);
    if (!burst) return () => window.clearTimeout(done);
    const ctx = fitCanvas(canvas, w, h);
    const stop = animate((dt, t) => {
      if (!burst(ctx, dt, t)) {
        stop();
        ctx.clearRect(0, 0, w, h);
      }
    });
    return () => {
      stop();
      window.clearTimeout(done);
    };
  }, []);
  return (
    <div className={`shop-fx ${fx.kind} fx-${fx.id}${fx.preview ? ' preview' : ''}`} style={{ ['--fx-ms' as string]: `${ms}ms` }} aria-live="polite">
      {!quiet && <canvas ref={ref} className="shop-fx-canvas" aria-hidden />}
      <span className="shop-fx-label">{fx.label}</span>
    </div>
  );
}
