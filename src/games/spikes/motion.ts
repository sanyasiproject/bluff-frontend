// Spike Attack movement on this phone: my character predicted every frame and sent ~12 times a second, the others smoothed between server updates
import { useEffect, useRef } from 'react';
import { SPIKES_RADIUS, SPIKES_SPEED, type SpikesView } from '../../types';

const SEND_MS = 83;
const INTERP_MS = 100;
const HISTORY_MS = 1200;
/** a server position this far from everything I sent means it clamped me */
const CLAMP_GAP = 0.3;

type P = [number, number];
interface Sample {
  t: number;
  p: P;
}

export interface Motion {
  /** where to draw a player now */
  posOf(id: string): P;
  /** my input this frame: a vector up to length 1 */
  input: { x: number; y: number };
}

/** `live`: I can move now; `send` posts my position */
export function useMotion(sv: SpikesView, meId: string, live: boolean, serverNow: () => number, send: (p: P) => void): Motion {
  const mine = useRef<P | null>(null);
  const sent = useRef<Sample[]>([]);
  const lastSend = useRef(0);
  const moving = useRef(false);
  const fix = useRef<P>([0, 0]);
  const calmUntil = useRef(0);
  const input = useRef({ x: 0, y: 0 });
  const buf = useRef<Record<string, Sample[]>>({});
  const st = useRef({ sv, live, send });
  st.current = { sv, live, send };

  // each view: buffer the others, and check my own place against the server's
  const seenNow = useRef(0);
  if (sv.now !== seenNow.current) {
    seenNow.current = sv.now;
    for (const [id, p] of Object.entries(sv.pos)) {
      const list = (buf.current[id] ??= []);
      list.push({ t: sv.now, p });
      while (list.length > 2 && list[1].t < sv.now - 1000) list.shift();
    }
    const s = sv.pos[meId];
    if (s) {
      if (!mine.current || !live) mine.current = [s[0], s[1]];
      else {
        const pnow = performance.now();
        const near = sent.current.reduce((m, x) => Math.min(m, Math.hypot(x.p[0] - s[0], x.p[1] - s[1])), sent.current.length ? Infinity : 0);
        const idle = pnow - lastSend.current > 450;
        // clamped (or the server moved me while I stood still): ease over to its place, then give the views a moment to catch up
        if (pnow > calmUntil.current && (near > CLAMP_GAP || (idle && !moving.current && Math.hypot(mine.current[0] - s[0], mine.current[1] - s[1]) > 0.04))) {
          fix.current = [s[0] - mine.current[0], s[1] - mine.current[1]];
          sent.current = [];
          calmUntil.current = pnow + 350;
        }
      }
    }
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const { sv: v, live: on, send: post } = st.current;
      const p = mine.current;
      if (!p) return;
      const r = SPIKES_RADIUS;
      const clampP = (q: P): P => [Math.min(v.size - r, Math.max(r, q[0])), Math.min(v.size - r, Math.max(r, q[1]))];
      // ease out any correction over ~150 ms
      const f = fix.current;
      if (Math.abs(f[0]) + Math.abs(f[1]) > 1e-4) {
        const k = Math.min(1, dt * 7);
        mine.current = clampP([p[0] + f[0] * k, p[1] + f[1] * k]);
        fix.current = [f[0] * (1 - k), f[1] * (1 - k)];
      }
      const { x, y } = input.current;
      const go = on && Math.hypot(x, y) > 0.05;
      if (go) {
        const q = mine.current!;
        mine.current = clampP([q[0] + x * SPIKES_SPEED * dt, q[1] + y * SPIKES_SPEED * dt]);
      }
      // send while moving (and once when I stop)
      if (on && (go || moving.current) && t - lastSend.current >= SEND_MS) {
        const q = mine.current!;
        const round = (n: number) => Math.round(n * 1000) / 1000;
        post([round(q[0]), round(q[1])]);
        lastSend.current = t;
        sent.current.push({ t, p: [q[0], q[1]] });
        while (sent.current.length && sent.current[0].t < t - HISTORY_MS) sent.current.shift();
        moving.current = go;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const posOf = (id: string): P => {
    if (id === meId && mine.current && (sv.lives[meId] ?? 0) > 0) return mine.current;
    const list = buf.current[id];
    if (!list?.length) return sv.pos[id] ?? [0.5, 0.5];
    const at = serverNow() - INTERP_MS;
    let i = list.length - 1;
    while (i > 0 && list[i - 1].t > at) i--;
    const b = list[i];
    const a = list[i - 1];
    if (!a || at >= b.t) return b.p;
    const k = Math.max(0, Math.min(1, (at - a.t) / Math.max(1, b.t - a.t)));
    return [a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k];
  };

  return { posOf, input: input.current };
}
