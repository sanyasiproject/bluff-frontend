// Bomb Pass moments from view changes: the fuse ticks, the toss arc, BOOM (shake, blast, soot, heart pop) and the wrong-answer shake
import { useEffect, useRef, useState, type RefObject } from 'react';
import { reducedMotion } from '../../lib/motion';
import type { BombView } from '../../types';
import { bombSfx, TICK_MS } from './sounds';

export interface BombFx {
  shake: boolean;
  blast: { at: number; id: string } | null;
  soot: string | null;
  /** the holder is shaking after a wrong answer */
  wrong: boolean;
}

/** spot: a seat's bomb point in % of the arena */
export function useBombFx(bv: BombView, meId: string, arena: RefObject<HTMLDivElement | null>, bomb: RefObject<HTMLDivElement | null>, spot: (id: string) => [number, number], onBoom: (id: string, out: boolean) => void): BombFx {
  const [shake, setShake] = useState(false);
  const [blast, setBlast] = useState<BombFx['blast']>(null);
  const [soot, setSoot] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const live = bv.phase === 'play' && !!bv.holder;

  // the fuse ticks, faster with heat
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => bombSfx.tick(bv.heat), TICK_MS[bv.heat] ?? 900);
    return () => window.clearInterval(t);
  }, [live, bv.heat]);

  // a toss: the bomb flies in an arc from the old holder to the new one
  const passAt = useRef(bv.lastPass?.at ?? null);
  useEffect(() => {
    const p = bv.lastPass;
    if (!p || p.at === passAt.current) return;
    passAt.current = p.at;
    bombSfx.toss();
    if (p.from === meId) bombSfx.right();
    const el = bomb.current;
    const box = arena.current;
    if (!el || !box || reducedMotion()) return;
    const [fx, fy] = spot(p.from);
    const [tx, ty] = spot(p.to);
    const ox = ((fx - tx) * box.clientWidth) / 100;
    const oy = ((fy - ty) * box.clientHeight) / 100;
    el.animate(
      [
        { transform: `translate(${ox}px, ${oy}px) rotate(0deg) scale(1)` },
        { transform: `translate(${ox / 2}px, ${oy / 2 - 70}px) rotate(200deg) scale(1.35)` },
        { transform: 'translate(0, 0) rotate(360deg) scale(1)' },
      ],
      { duration: 520, easing: 'cubic-bezier(.3,.7,.4,1)' },
    );
  }, [bv.lastPass?.at]);

  // BOOM: shake, blast and soot on the loser, a heart pops
  const boomAt = useRef(bv.lastBoom?.at ?? null);
  useEffect(() => {
    const b = bv.lastBoom;
    if (!b || b.at === boomAt.current) return;
    boomAt.current = b.at;
    bombSfx.boom();
    bombSfx.heart();
    setShake(true);
    setBlast({ at: b.at, id: b.playerId });
    setSoot(b.playerId);
    navigator.vibrate?.([220, 80, 220]);
    onBoom(b.playerId, b.out);
    const ts = [window.setTimeout(() => setShake(false), 650), window.setTimeout(() => setBlast(null), 1300), window.setTimeout(() => setSoot(null), 3200)];
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [bv.lastBoom?.at]);

  // a wrong answer: the server holds a shake until shakeUntil
  useEffect(() => {
    const left = bv.shakeUntil - bv.now;
    if (left <= 0) return setWrong(false);
    setWrong(true);
    if (bv.holder === meId) {
      bombSfx.wrong();
      navigator.vibrate?.(60);
    }
    const t = window.setTimeout(() => setWrong(false), left);
    return () => window.clearTimeout(t);
  }, [bv.shakeUntil]);

  return { shake, blast, soot, wrong };
}
