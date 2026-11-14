/** e.g. "Nov 2026" */
export const monthYear = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', year: 'numeric' });

/** e.g. "9 Nov 2026, 11:30 pm" */
export const dateTime = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

/** e.g. "just now", "5 min ago", "3 h ago", "2 days ago" */
export function timeAgo(iso: string): string {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} h ago`;
  const days = Math.floor(sec / 86_400);
  return days < 30 ? `${days} day${days > 1 ? 's' : ''} ago` : dateTime(iso);
}

/** like timeAgo, but a month or more back shows just the month ("in Oct 2026") */
const lastSeenAgo = (iso: string) => ((Date.now() - new Date(iso).getTime()) / 86_400_000 < 30 ? timeAgo(iso) : `in ${monthYear(iso)}`);

/** a friend's presence: "online", "last online 5 min ago" (short: "seen 5 min ago", for narrow rows), or "offline" when it isn't known */
export const presenceText = (online: boolean, lastSeen: string | null, short = false) =>
  online ? 'online' : lastSeen ? `${short ? 'seen' : 'last online'} ${lastSeenAgo(lastSeen)}` : 'offline';
