// Sea Battle moments from the last shot: sounds, banners for sinks, powers and fleets out, and which sea to show while others shoot
import { useEffect, useRef, useState } from 'react';
import type { SeaShotView, SeaView } from '../../types';
import type { Banner } from '../turnkit/base';
import { seaSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';

const POWER_NAME = { radar: '📡 Radar', salvo: '💥 Salvo', torpedo: '🚀 Torpedo' } as const;

/** the fresh shot (for effects) for about 1.4 s after it lands */
export function useSeaShots(bv: SeaView, meId: string, name: (id: string) => string, show: (b: Omit<Banner, 'key'>, delay?: number, ms?: number) => void, onShot: (s: SeaShotView) => void): SeaShotView | null {
  const [fresh, setFresh] = useState<SeaShotView | null>(null);
  const seen = useRef(bv.last?.seq ?? null);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const cb = useRef(onShot);
  cb.current = onShot;
  useEffect(() => {
    const s = bv.last;
    if (!s || s.seq === seen.current) return;
    seen.current = s.seq;
    cb.current(s);
    setFresh(s);
    if (s.kind === 'radar') seaSfx.radar();
    else {
      if (s.kind === 'torpedo') seaSfx.torpedo();
      else seaSfx.gun();
      s.cells.forEach((c, i) => (c.hit ? seaSfx.hit(0.25 + i * 0.12) : seaSfx.splash(0.25 + i * 0.12)));
      if (s.kind === 'torpedo' && !s.cells.length) seaSfx.splash(0.6);
    }
    const sunk = s.cells.some((c) => c.sunk);
    const by = name(s.by);
    const at = s.target === meId ? 'your' : `${name(s.target)}'s`;
    if (s.out) {
      seaSfx.sink();
      show({ text: s.target === meId ? 'Your fleet is sunk' : `${name(s.target)} is out!`, sub: `${by} sank the last ship`, tone: s.target === meId ? 'red' : 'gold' }, 500, 2200);
    } else if (sunk) {
      seaSfx.sink();
      show({ text: 'Sunk! 🚢', sub: `${by} sank ${at} ship${s.earned ? ` · got ${POWER_NAME[s.earned]}` : ''}`, tone: s.by === meId ? 'gold' : 'info' }, 500, 1900);
      if (s.earned && s.by === meId) tm.later(seaSfx.power, 900);
    } else if (s.kind === 'radar' && s.by === meId && s.count !== undefined) {
      show({ text: `📡 ${s.count} ship cell${s.count === 1 ? '' : 's'}`, sub: 'in that 3 × 3', tone: 'info' }, 200, 1600);
    }
    if (s.target === meId && s.cells.some((c) => c.hit)) navigator.vibrate?.(sunk ? [80, 40, 120] : 50);
    const t = window.setTimeout(() => setFresh(null), 1400 + s.cells.length * 120);
    return () => window.clearTimeout(t);
  }, [bv.last?.seq]);
  return fresh;
}
