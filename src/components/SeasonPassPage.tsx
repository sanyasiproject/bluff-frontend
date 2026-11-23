import { useEffect, useRef, useState } from 'react';
import { ApiError, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { confettiAt } from '../lib/motion';
import {
  MAX_SHIELDS,
  MIN_REWARD_GAME_SEC,
  PASS_SHIELD_COINS,
  PASS_TIER_XP,
  PASS_TIERS,
  PASS_XP,
  type PassResponse,
  type PassReward,
  type PassTierView,
} from '../types';
import type { Auth } from '../useAuth';
import { FullPage } from './FullPage';

const DAY_MS = 86_400_000;

/** a reward in a few words */
export function rewardText(r: PassReward): { emoji: string; text: string } {
  if (r.kind === 'shield') return { emoji: '🛡️', text: 'Rank Shield' };
  if (r.kind === 'xp') return { emoji: '⭐', text: `+${r.amount} XP` };
  return { emoji: '🪙', text: `${formatCoins(r.amount)} coins` };
}

/** how long the season has left, or how long it has run when no next season is booked */
function seasonText(p: PassResponse, now: number): string {
  const ends = p.endsAt ? Date.parse(p.endsAt) : NaN;
  if (!Number.isNaN(ends)) {
    const days = Math.ceil((ends - now) / DAY_MS);
    return days <= 0 ? 'Season ends today' : days === 1 ? '1 day left in the season' : `${days} days left in the season`;
  }
  const start = p.startedAt ? Date.parse(p.startedAt) : NaN;
  if (Number.isNaN(start)) return 'Runs till the next season starts';
  return `Day ${Math.max(1, Math.floor((now - start) / DAY_MS) + 1)} · runs till the next season starts`;
}

interface RowProps {
  t: PassTierView;
  /** the tier being filled now */
  current: boolean;
  /** XP into the current tier */
  into: number;
  busy: boolean;
  onClaim: (tier: number, el: HTMLElement) => void;
}

function TierRow({ t, current, into, busy, onClaim }: RowProps) {
  const { emoji, text } = rewardText(t.reward);
  const big = t.reward.kind === 'coins' && t.tier % 10 === 0;
  const canClaim = t.reached && !t.claimed;
  return (
    <li
      className={cx('pass-tier', t.reached && 'reached', t.claimed && 'claimed', canClaim && 'ready', current && 'current', big && 'big', t.reward.kind)}
      data-tier={t.tier}
    >
      <span className="pass-tier-num" aria-label={`Tier ${t.tier}`}>
        {t.tier}
      </span>
      <div className="pass-tier-main">
        <b className="pass-tier-reward">
          <span aria-hidden>{emoji}</span> {text}
        </b>
        {t.reward.kind === 'shield' && !t.claimed && (
          <small className="pass-tier-note">
            🪙 {formatCoins(PASS_SHIELD_COINS)} instead if you hold {MAX_SHIELDS}
          </small>
        )}
        {current && !t.reached && (
          <div className="pass-tier-bar" aria-hidden>
            <i style={{ width: `${(into / PASS_TIER_XP) * 100}%` }} />
          </div>
        )}
      </div>
      {t.claimed ? (
        <span className="pass-tier-state done">✓ Claimed</span>
      ) : canClaim ? (
        <button type="button" className="btn small pass-claim" disabled={busy} onClick={(e) => onClaim(t.tier, e.currentTarget)}>
          Claim
        </button>
      ) : (
        <span className="pass-tier-state" aria-label="Locked">
          {current ? `${PASS_TIER_XP - into} XP` : '🔒'}
        </span>
      )}
    </li>
  );
}

interface Props {
  auth: Auth;
  onClose: () => void;
  /** the pass the caller already has, shown until a fresh one arrives */
  initial?: PassResponse | null;
  /** every fresh copy, so the caller's tier and dot stay right */
  onChange?: (p: PassResponse) => void;
}

/** the free season pass: progress, days left, and the 30-tier track with Claim buttons */
export function SeasonPassPage({ auth, onClose, initial = null, onChange }: Props) {
  const [data, setData] = useState<PassResponse | null>(initial);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const changed = useRef(onChange);
  const listRef = useRef<HTMLOListElement>(null);
  const scrolled = useRef(false);
  changed.current = onChange;

  const got = (p: PassResponse) => {
    setData(p);
    changed.current?.(p);
  };

  const load = () => {
    auth
      .pass()
      .then((p) => {
        setError('');
        got(p);
      })
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'The season pass is coming soon. Try again later.' : errorText(err)));
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const tier = data?.tier ?? 0;
  const last = PASS_TIERS.length;
  /** the tier being filled now (the last one once the track is done) */
  const currentTier = Math.min(last, tier + 1);

  // open at the tier being filled, once
  useEffect(() => {
    if (!data || scrolled.current) return;
    scrolled.current = true;
    const firstReady = data.tiers.find((t) => t.reached && !t.claimed)?.tier ?? currentTier;
    listRef.current?.querySelector(`[data-tier="${firstReady}"]`)?.scrollIntoView({ block: 'center', inline: 'center' });
  }, [data]);

  const claim = async (n: number, el: HTMLElement) => {
    setError('');
    setNote('');
    setBusy(true);
    try {
      const res = await auth.claimPass(n);
      got(res.pass);
      confettiAt(el, { count: n % 10 === 0 ? 60 : 30 });
      const { emoji, text } = rewardText(res.got);
      setNote(
        res.shieldSwapped
          ? `You already hold ${MAX_SHIELDS} Rank Shields, so tier ${n} gave you 🪙 ${formatCoins(res.got.amount)} instead.`
          : `Tier ${n}: ${emoji} ${text} added.`,
      );
    } catch (err) {
      setError(errorText(err));
      // claimed on another phone, or a new season: show what's true now
      load();
    } finally {
      setBusy(false);
    }
  };

  const into = data ? (tier >= last ? PASS_TIER_XP : data.xp - tier * PASS_TIER_XP) : 0;
  const total = (data?.xp ?? 0) / (last * PASS_TIER_XP);

  return (
    <FullPage title="Season pass" onBack={onClose} className="lp-split lp-pass">
      {!data && !error && <p className="muted small">Loading…</p>}
      {error && <p className="form-error">{error}</p>}
      {!data && error && (
        <button className="btn ghost block" onClick={load}>
          Try again
        </button>
      )}
      {data && (
        <>
          <section className="panel pass-head">
            <div className="pass-head-top">
              <div>
                <span className="label">Season {data.season}</span>
                <b className="pass-head-tier">
                  Tier {tier}
                  <small>/{last}</small>
                </b>
              </div>
              {data.claimable > 0 && <span className="pass-ready-pill">{data.claimable} to claim</span>}
            </div>
            <div className="pass-bar" role="progressbar" aria-valuemin={0} aria-valuemax={last * PASS_TIER_XP} aria-valuenow={data.xp}>
              <i style={{ width: `${Math.min(1, total) * 100}%` }} />
            </div>
            <p className="pass-head-meta">
              <span>{tier >= last ? 'Track complete 🎉' : `${into}/${PASS_TIER_XP} XP to tier ${currentTier}`}</span>
              <span>{seasonText(data, now)}</span>
            </p>
            <p className="muted small pass-how">
              Games of {MIN_REWARD_GAME_SEC / 60} min or more: +{PASS_XP.game} a game, +{PASS_XP.win} a win, +{PASS_XP.mission} a mission done. The pass starts again
              each new season.
            </p>
          </section>
          {note && (
            <p className="pass-note" role="status">
              {note}
            </p>
          )}
          <ol className="pass-track" ref={listRef}>
            {data.tiers.map((t) => (
              <TierRow key={t.tier} t={t} current={t.tier === currentTier} into={into} busy={busy} onClaim={(n, el) => void claim(n, el)} />
            ))}
          </ol>
        </>
      )}
    </FullPage>
  );
}

/** the 🎟️ Season pass button with the tier and a dot when something can be claimed; hidden for guests and older servers */
export function SeasonPassButton({ auth, online = true }: { auth: Auth; online?: boolean }) {
  const userId = auth.user?.id ?? null;
  /** null until loaded; 'off' when the server has no pass yet */
  const [pass, setPass] = useState<PassResponse | 'off' | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setPass(null), [userId]);
  useEffect(() => {
    if (!userId || !online) return;
    let live = true;
    auth
      .pass()
      .then((p) => live && setPass(p))
      .catch((err) => {
        if (live && err instanceof ApiError && err.status === 404) setPass('off');
      });
    return () => {
      live = false;
    };
  }, [userId, online]);

  if (!userId || (pass === 'off' && !open)) return null;
  const p = pass && pass !== 'off' ? pass : null;
  return (
    <>
      <button className="panel missions-entry pass-entry" onClick={() => setOpen(true)}>
        <span className="missions-entry-emoji" aria-hidden>
          🎟️
        </span>
        <span className="grow">Season pass</span>
        {p && (
          <span className={cx('missions-pill', p.tier >= PASS_TIERS.length && 'done')}>
            Tier {p.tier}/{PASS_TIERS.length}
          </span>
        )}
        {p && p.claimable > 0 && <span className="pass-dot" role="img" aria-label={`${p.claimable} rewards to claim`} />}
        <span className="missions-chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && <SeasonPassPage auth={auth} initial={p} onChange={setPass} onClose={() => setOpen(false)} />}
    </>
  );
}
