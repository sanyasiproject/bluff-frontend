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

/** the PIN from an invite link of a locked room (?pin=1234), if any */
export function invitePin(): string | null {
  const pin = new URLSearchParams(location.search).get('pin') ?? '';
  return /^[0-9]{4}$/.test(pin) ? pin : null;
}

// a locked room's invite (host only) carries its PIN, so friends join in one tap
export const inviteLink = (code: string, pin?: string | null) => `${location.origin}/?room=${code}${pin ? `&pin=${pin}` : ''}`;

export const inviteText = (code: string, pin?: string | null) => `Join my Game Baithak room 🎲 Room code: ${code}${pin ? ` · PIN: ${pin}` : ''}`;

export const inviteMessage = (code: string, pin?: string | null) => `${inviteText(code, pin)}\n${inviteLink(code, pin)}`;

export const whatsappUrl = (code: string, pin?: string | null) => `https://wa.me/?text=${encodeURIComponent(inviteMessage(code, pin))}`;
