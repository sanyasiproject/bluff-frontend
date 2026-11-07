import { inviteLink, inviteMessage, inviteText, whatsappUrl } from '../lib/invite';

/** WhatsApp / share sheet / copy; the link drops friends straight into this room */
export function InvitePanel({ code, onToast }: { code: string; onToast: (text: string) => void }) {
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
    <section className="panel">
      <h2 className="section-title">Invite friends</h2>
      <p className="muted small">They tap the link and land straight in room {code}.</p>
      <div className="share-row">
        <a className="btn whatsapp" href={whatsappUrl(code)} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {canShare && (
          <button className="btn" onClick={share}>
            Share…
          </button>
        )}
        <button className="btn" onClick={copy}>
          Copy
        </button>
      </div>
      <p className="invite-link">{link}</p>
    </section>
  );
}
