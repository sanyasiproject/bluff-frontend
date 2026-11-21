import { isMuted, setMuted, useMuteVersion } from '../lib/mute';

interface Who {
  id: string;
  username: string | null;
  name: string;
}

/** mute someone just for me: their chat, emojis and voice stop reaching me; everyone else still hears them */
export function MuteButton({ player }: { player: Who }) {
  useMuteVersion();
  const on = isMuted(player);
  return (
    <button className={on ? 'btn block mute-btn on' : 'btn ghost block mute-btn'} aria-pressed={on} onClick={() => setMuted(player, !on)}>
      {on ? `🔊 Unmute ${player.name}` : `🔇 Mute ${player.name}`}
      <small>{on ? "You don't see or hear them. Others still do" : 'Only for you: hide their chat, emojis and voice'}</small>
    </button>
  );
}

/** a small 🔇 on players I muted */
export function MuteMark({ player, className }: { player: Pick<Who, 'id' | 'username'>; className?: string }) {
  useMuteVersion();
  if (!isMuted(player)) return null;
  return (
    <span className={className ?? 'mute-mark'} title="Muted by you" aria-label="Muted by you">
      🔇
    </span>
  );
}
