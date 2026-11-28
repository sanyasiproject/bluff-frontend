// Ludo looks: board themes, goti styles and dice skins (shared lists), my picks saved per phone and sent to the room
import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../../lib/storage';
import {
  DEFAULT_LUDO_LOOK,
  LUDO_BOARD_LOOKS,
  LUDO_DICE_LOOKS,
  LUDO_GOTI_LOOKS,
  LUDO_LOOKS,
  ludoLookOk,
  type LudoLookChoice,
  type LudoLookKind,
  type PublicPlayer,
} from '../../types';

export type LudoLooks = LudoLookChoice;
export type { LudoLookKind };

export const LUDO_BOARDS = LUDO_BOARD_LOOKS;
export const LUDO_GOTIS = LUDO_GOTI_LOOKS;
export const LUDO_DICE = LUDO_DICE_LOOKS;
export const LUDO_LOOK_LISTS = LUDO_LOOKS;

const KEY = (k: LudoLookKind) => `ludo.${k}`;
const EVENT = 'ludo-looks';

/** my saved picks, each falling back to the free look when missing or locked at this level */
export const loadLudoLooks = (level: number): LudoLooks => ({
  board: ludoLookOk('board', loadPref(KEY('board')), level),
  goti: ludoLookOk('goti', loadPref(KEY('goti')), level),
  dice: ludoLookOk('dice', loadPref(KEY('dice')), level),
});

/** saves one pick on this phone and tells every open Ludo screen (and the room sender) */
export function saveLudoLook(kind: LudoLookKind, id: string): void {
  savePref(KEY(kind), id);
  window.dispatchEvent(new Event(EVENT));
}

/** calls back whenever a pick changes on this phone */
function onLudoLooksChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** this phone's Ludo looks, kept in step when they change */
export function useLudoLooks(level: number): LudoLooks {
  const [looks, setLooks] = useState(() => loadLudoLooks(level));
  useEffect(() => {
    const update = () => setLooks(loadLudoLooks(level));
    update();
    return onLudoLooksChange(update);
  }, [level]);
  return looks;
}

/** an id this app can draw, else the free one */
const known = (kind: LudoLookKind, id: string | undefined): string => (LUDO_LOOKS[kind].some((l) => l.id === id) ? id! : DEFAULT_LUDO_LOOK[kind]);

/** a player's looks as the room sees them; mine falls back to my picks when the server sends none */
export function lookOfPlayer(p: Pick<PublicPlayer, 'id' | 'ludoLook'> | undefined, meId: string, mine: LudoLooks): LudoLooks {
  const l = p?.ludoLook ?? (p?.id === meId ? mine : DEFAULT_LUDO_LOOK);
  return { board: known('board', l.board), goti: known('goti', l.goti), dice: known('dice', l.dice) };
}

/** sends my picks while I'm in a room (roomKey changes on entering and on every rejoin) and whenever I change one */
export function useSendLudoLook(roomKey: string | null, level: number, send: (look: LudoLooks) => unknown): void {
  useEffect(() => {
    if (!roomKey) return;
    const push = () => void send(loadLudoLooks(level));
    push();
    return onLudoLooksChange(push);
  }, [roomKey, level]);
}
