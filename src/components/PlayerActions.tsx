import { useState } from 'react';
import { sendGift, type GiftTarget } from '../lib/gifts';
import { DAILY_GIFT_LIMIT, GIFT_STEPS, THROWS } from '../types';
import type { Auth } from '../useAuth';

/** emoji to throw at someone; everyone in the room sees it fly */
export function ThrowRow({ onThrow }: { onThrow: (index: number) => void }) {
  return (
    <div className="throw-box">
      <p className="label">Throw an emoji</p>
      <div className="throw-row">
        {THROWS.map((emoji, i) => (
          <button key={emoji} className="throw-btn" aria-label={`Throw ${emoji}`} onClick={() => onThrow(i)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** coins for a friend, within the daily limit */
export function GiftRow({ auth, name, target }: { auth: Auth; name: string; target: GiftTarget }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const user = auth.user;
  if (!user) return null;
  const left = user.giftLeft;

  const send = async (amount: number) => {
    setBusy(true);
    setResult(null);
    try {
      await sendGift(target, amount);
      setResult({ ok: true, text: `Sent 🪙 ${amount} to ${name} 🎁` });
      await auth.refresh();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Couldn't send coins" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gift-box">
      <p className="label">🎁 Send coins to {name}</p>
      <div className="gift-row">
        {GIFT_STEPS.map((n) => (
          <button key={n} className="btn small" disabled={busy || n > left || n > user.coins} onClick={() => void send(n)}>
            🪙 {n}
          </button>
        ))}
      </div>
      <p className="muted small">
        {left > 0 ? `You can give 🪙 ${left} more today` : "You've given today's coins. More tomorrow"} · {DAILY_GIFT_LIMIT} a day in total
      </p>
      {result && <p className={result.ok ? 'gift-ok' : 'form-error'}>{result.text}</p>}
    </div>
  );
}
