// Invite links look like https://bluff-frontend.vercel.app/?room=ABCD

/** room code from the current page's invite link, if any */
export function inviteCode(): string | null {
  const code = (new URLSearchParams(location.search).get('room') ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return code.length === 4 ? code : null;
}

/** removes ?room= so a reload or "Leave room" doesn't join again */
export function clearInvite(): void {
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
}

export const inviteLink = (code: string) => `${location.origin}/?room=${code}`;

export const inviteText = (code: string) => `Join my Bluff game 🃏 Room code: ${code}`;

export const inviteMessage = (code: string) => `${inviteText(code)}\n${inviteLink(code)}`;

export const whatsappUrl = (code: string) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(code))}`;
