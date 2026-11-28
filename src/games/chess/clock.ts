// Chess clocks from the server's numbers: the side to move counts down from runningSince, in server time
import { useEffect, useRef, useState } from 'react';
import type { ChessView, Color } from './lib';

/** time left for each side right now (ms); ticks while a clock runs */
export function useClocks(cv: ChessView): { w: number; b: number } | null {
  const offset = useRef(0);
  const seen = useRef<number | null>(null);
  if (seen.current !== cv.now) {
    seen.current = cv.now;
    offset.current = Date.now() - cv.now;
  }
  const [, setTick] = useState(0);
  const running = cv.status === 'playing' && cv.clock?.runningSince != null;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(t);
  }, [running, cv.now]);
  const c = cv.clock;
  if (!c) return null;
  const spent = running ? Math.max(0, Date.now() - offset.current - c.runningSince!) : 0;
  const left = (side: Color) => Math.max(0, c[side] - (side === cv.turn ? spent : 0));
  return { w: left('w'), b: left('b') };
}

/** 5:03, 0:09.4 under 10 s, 1:02:00 for long games */
export function clockText(ms: number): string {
  const s = ms / 1000;
  if (s < 10) return `0:0${Math.floor(s)}.${Math.floor((s * 10) % 10)}`;
  const t = Math.ceil(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** seconds left to make the first move before the game is aborted (server time), or null */
export function useAbortIn(cv: ChessView): number | null {
  const offset = useRef(0);
  const seen = useRef<number | null>(null);
  if (seen.current !== cv.now) {
    seen.current = cv.now;
    offset.current = Date.now() - cv.now;
  }
  const on = cv.status === 'playing' && cv.abortAt != null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [on]);
  return on ? Math.max(0, Math.ceil((cv.abortAt! - (Date.now() - offset.current)) / 1000)) : null;
}
