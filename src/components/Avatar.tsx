import type { ReactNode } from 'react';
import { avatarLook } from '../lib/avatars';
import { avatarColor, cx } from '../lib/cards';
import { CharacterPic } from './CharacterPic';

interface Props {
  name: string;
  /** "face.bg"; missing or unknown shows the first letter */
  avatar?: string | null;
  bot?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** room member id, so throws and flights can find this avatar */
  member?: string;
  /** badges on the corner (level, online dot, edit) */
  children?: ReactNode;
}

/** a player's picture: their chosen character or face on its background, else the first letter; bots are 🤖 */
export function Avatar({ name, avatar, bot, size = 'md', className, member, children }: Props) {
  const look = bot ? null : avatarLook(avatar);
  const sizeClass = size === 'md' ? null : size;
  if (bot) {
    return (
      <span className={cx('avatar', sizeClass, 'bot-avatar', className)} data-member={member} aria-hidden>
        🤖
        {children}
      </span>
    );
  }
  if (!look) {
    return (
      <span className={cx('avatar', sizeClass, className)} data-member={member} style={{ background: avatarColor(name) }}>
        {name[0]?.toUpperCase()}
        {children}
      </span>
    );
  }
  return (
    <span className={cx('avatar', sizeClass, 'has-face', look.character && 'has-char', `av-${look.bgId}`, className)} data-member={member}>
      {/* clipped to the circle; badges stay outside it */}
      <span className="avatar-art" style={{ background: look.background }} aria-hidden>
        {look.emoji ? <span className="avatar-emoji">{look.emoji}</span> : look.character && <CharacterPic id={look.character} />}
        {look.shimmer && <span className="avatar-shimmer" />}
      </span>
      {children}
    </span>
  );
}
