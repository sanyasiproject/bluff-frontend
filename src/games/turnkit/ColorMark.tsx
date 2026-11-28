// Player colour markers: a colour chip on every seat, "You · Red" on mine and a short "You are Red" banner at the start
import '../../styles/land-colors.css';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { Pawn } from '../ludo/Gotis';
import type { LudoColor } from '../../types';

/** colour names for the Ludo colours and the party colours */
const NAMES: Record<string, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
  '#ff5252': 'Red',
  '#40c4ff': 'Blue',
  '#69f0ae': 'Green',
  '#ffd740': 'Yellow',
};

/** piece colours exactly as the gotis draw them (land-ludo-goti.css) */
export const GOTI_HEX: Record<LudoColor, string> = { red: '#e53935', green: '#3fa045', yellow: '#f9c623', blue: '#1e88e5' };

export const colorName = (c: string): string => NAMES[c.toLowerCase()] ?? 'Colour';

/** a small standing goti in a player's colour and goti style */
export function MiniGoti({ color, style, className }: { color: LudoColor; style: string; className?: string }) {
  return (
    <span className={cx('cm-goti', className)} aria-hidden>
      <Pawn color={color} style={style} />
    </span>
  );
}

/** the colour chip: icon + colour name; on my seat "You · Red" */
export function ColorMark({ color, name, icon, mine }: { color: string; name: string; icon?: ReactNode; mine: boolean }) {
  return (
    <span className={cx('cm-chip', mine && 'you')} style={{ '--cm': color } as CSSProperties} title={mine ? `You are ${name}` : name}>
      {icon ?? <i className="cm-dot" aria-hidden />}
      <b>{mine ? `You · ${name}` : name}</b>
    </span>
  );
}

/** "You are Red": shown for 2 s when the table opens mid-game for a player */
export function YouAreBanner({ color, name, icon, on }: { color: string; name: string; icon?: ReactNode; on: boolean }) {
  const [shown, setShown] = useState(on);
  useEffect(() => {
    if (!on) return;
    setShown(true);
    const t = window.setTimeout(() => setShown(false), 2000);
    return () => window.clearTimeout(t);
  }, [on]);
  if (!shown) return null;
  return (
    <div className="cm-youare" style={{ '--cm': color } as CSSProperties} role="status">
      {icon ?? <i className="cm-dot" aria-hidden />}
      <b>{`You are ${name}`}</b>
    </div>
  );
}
