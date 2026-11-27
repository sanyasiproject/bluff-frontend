// The dice's one fixed spot for the whole game: ringed in the turn player's colour, with their goti and name
import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../lib/cards';
import type { LudoColor } from '../../types';
import { GOTI_HEX, MiniGoti } from '../turnkit/ColorMark';

interface Props {
  /** the turn player's colour (null before anyone's turn) */
  color: LudoColor | null;
  gotiStyle: string;
  /** the turn player's name */
  who: string;
  mine: boolean;
  /** I may roll now */
  live: boolean;
  children: ReactNode;
}

export function DiceDock({ color, gotiStyle, who, mine, live, children }: Props) {
  const style = { '--dock': color ? GOTI_HEX[color] : '#ffffff' } as CSSProperties;
  return (
    <div className={cx('lu-dock', mine && 'mine', live && 'live')} style={style}>
      <span className="lu-dock-who">
        {color && <MiniGoti color={color} style={gotiStyle} />}
        <b>{mine ? 'Your turn' : `${who}'s turn`}</b>
      </span>
      {children}
    </div>
  );
}
