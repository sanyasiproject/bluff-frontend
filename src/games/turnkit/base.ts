// Shared state for the turn-based party tables (Darts, Dots and Boxes, Colour Wars): names, bubbles, seats, banners, level-up
import { useEffect, useRef, useState } from 'react';
import { useBack } from '../../lib/back';
import { PARTY_COLORS, type RoomView } from '../../types';
import type { ChatBubble } from '../../useBluff';
import type { LudoPanel } from '../ludo/LudoMenus';

const BUBBLE_MS = 4000;
/** seat corners round the board, me first (near left), then clockwise */
export const PARTY_CORNERS: Record<number, string[]> = { 1: ['bl'], 2: ['bl', 'tr'], 3: ['bl', 'tl', 'tr'], 4: ['bl', 'tl', 'tr', 'br'] };

export interface Banner {
  key: number;
  text: string;
  sub?: string;
  tone: 'gold' | 'red' | 'info' | 'good';
}

/** the game's seat order as the server made it; colours follow it */
export function useSeatOrder(view: RoomView, fromView: string[] | null): string[] {
  const seen = useRef<string[]>([]);
  const ids = fromView && fromView.length ? fromView : [...view.players.map((p) => p.id), ...view.leftPlayers.map((p) => p.id)];
  for (const id of ids) if (!seen.current.includes(id)) seen.current.push(id);
  return fromView && fromView.length ? fromView : seen.current;
}

export function usePartyBase(view: RoomView, bubbles: ChatBubble[], order: string[]) {
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const startLevel = useRef<number | null>(null);
  useBack(() => setPanel('menu'));

  const me = view.players.find((p) => p.id === view.meId);
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const people = [...view.players, ...view.leftPlayers];
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : (people.find((p) => p.id === id)?.name ?? 'Someone'));
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const colorOf = (id: string | null | undefined) => PARTY_COLORS[Math.max(0, order.indexOf(id ?? '')) % PARTY_COLORS.length];

  // me at the near left, the others clockwise
  const at = Math.max(0, order.indexOf(view.meId));
  const cornerOf = (id: string) => {
    const n = order.length;
    const i = order.indexOf(id);
    return (PARTY_CORNERS[n] ?? PARTY_CORNERS[4])[(i - at + n) % n] ?? 'bl';
  };

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setOverSeen(false);
  }, [playing]);
  const myLevel = me?.level ?? null;
  useEffect(() => {
    if (view.phase === 'over' && myLevel !== null && startLevel.current !== null && myLevel > startLevel.current) setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  const timer = useRef(0);
  const show = (b: Omit<Banner, 'key'>, delay = 0, ms = 1700) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setBanner({ ...b, key: Date.now() });
      timer.current = window.setTimeout(() => setBanner(null), ms);
    }, delay);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { panel, setPanel, target, setTarget, overSeen, setOverSeen, levelUp, setLevelUp, banner, show, startLevel, me, playing, isHost, name, bubbleOf, colorOf, cornerOf };
}

export type PartyBase = ReturnType<typeof usePartyBase>;

/** the podium waits a moment after the last move so it can be seen */
export function useOverReady(view: RoomView, delayMs: number): boolean {
  const [ready, setReady] = useState(view.phase === 'over');
  useEffect(() => {
    if (view.phase !== 'over') return setReady(false);
    const t = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(t);
  }, [view.phase]);
  return ready;
}
