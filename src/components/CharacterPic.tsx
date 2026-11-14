/** a girl or boy character filling its parent; drawn ahead of time by `npm run avatars` (tools/draw-characters.ts) */
export function CharacterPic({ id }: { id: string }) {
  return <img className="avatar-char" src={`${import.meta.env.BASE_URL}avatars/${id}.svg`} alt="" draggable={false} decoding="async" />;
}
