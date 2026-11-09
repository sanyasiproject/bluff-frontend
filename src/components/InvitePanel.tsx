import { inviteLink, inviteMessage, inviteText, whatsappUrl } from '../lib/invite';

interface Props {
  code: string;
  onToast: (text: string) => void;
  /** logged-in players can also invite online friends directly */
  onFriends?: () => void;
  /** friend requests waiting, shown on the Friends button */
  requests?: number;
}

/** one compact row: WhatsApp, share sheet, copy, friends; the link drops people straight into this room */
export function InvitePanel({ code, onToast, onFriends, requests = 0 }: Props) {
  const link = inviteLink(code);
  const canShare = typeof navigator.share === 'function';

  const share = async () => {
    try {
      // text + url separately: apps like WhatsApp join them into one message
      await navigator.share({ title: 'Bluff', text: inviteText(code), url: link });
    } catch {
      // share sheet closed
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage(code));
      onToast('Invite copied, paste it anywhere');
    } catch {
      // clipboard is blocked on plain-http pages, so let the player copy it by hand
      window.prompt('Copy this invite', inviteMessage(code));
    }
  };

  return (
    <section className="invite-bar">
      <p className="invite-caption">Invite friends</p>
      <div className="share-row">
        <a className="share-btn whatsapp" href={whatsappUrl(code)} target="_blank" rel="noopener noreferrer">
          <span>💬</span>WhatsApp
        </a>
        {canShare && (
          <button className="share-btn" onClick={share}>
            <span>📤</span>Share
          </button>
        )}
        <button className="share-btn" onClick={copy}>
          <span>🔗</span>Copy
        </button>
        {onFriends && (
          <button className="share-btn" onClick={onFriends}>
            {requests > 0 && <i className="req-dot">{requests}</i>}
            <span>👥</span>Friends
          </button>
        )}
      </div>
    </section>
  );
}
