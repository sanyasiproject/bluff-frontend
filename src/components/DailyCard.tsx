import { useRef, useState } from 'react';
import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { LOGIN_STREAK_REWARDS, loginRewardOf, SPIN_PRIZES, type SpinResponse } from '../types';
import type { Auth } from '../useAuth';
import { Backdrop } from './Overlays';

const SLICE = 360 / SPIN_PRIZES.length;
const SPIN_MS = 4200;
const TOP_PRIZE = Math.max(...SPIN_PRIZES.filter((p) => p.kind === 'coins').map((p) => p.amount));
// alternating slice colours, gold for the top prize
const COLORS = ['#2b6cb0', '#7c3aed', '#0f766e', '#b45309', '#be185d', '#1d4ed8', '#15803d', '#d4a017'];

const prizeText = (p: { kind: 'coins' | 'xp'; amount: number }) => (p.kind === 'coins' ? `🪙 ${formatCoins(p.amount)}` : `⭐ ${p.amount} XP`);

/** a point on the wheel's edge, angle in degrees clockwise from the top */
const at = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return `${100 + r * Math.cos(rad)} ${100 + r * Math.sin(rad)}`;
};

/** Profile: the login streak, 7 growing days (nothing to tap) */
export function LoginStreakCard({ auth }: { auth: Auth }) {
  const user = auth.user;
  // guests and older servers: nothing
  if (!user || user.loginStreak === undefined) return null;
  const streak = Math.max(1, user.loginStreak);
  const day = ((streak - 1) % LOGIN_STREAK_REWARDS.length) + 1;
  return (
    <section className="panel daily-card">
      <div className="daily-head">
        <span className="daily-streak">
          🔥 <b>{streak}</b> day{streak === 1 ? '' : 's'} in a row
        </span>
        <span className="muted small">Tomorrow +{formatCoins(loginRewardOf(streak + 1))}</span>
      </div>
      <ol className="streak-days" aria-label={`Day ${day} of 7`}>
        {LOGIN_STREAK_REWARDS.map((coins, i) => (
          <li key={i} className={cx(i + 1 < day && 'got', i + 1 === day && 'today')}>
            <span>Day {i + 1}</span>
            <b>{coins >= 1000 ? `${coins / 1000}K` : coins}</b>
          </li>
        ))}
      </ol>
      <p className="muted small">Open the app every day. Miss a day and the streak starts again.</p>
    </section>
  );
}

/** Home: today's free spin; gone once used until tomorrow */
export function SpinButton({ auth }: { auth: Auth }) {
  const [open, setOpen] = useState(false);
  const user = auth.user;
  // guests, older servers, and once spun today (the sheet stays open to show the prize)
  if (!user || user.spunToday === undefined || (user.spunToday && !open)) return null;
  return (
    <>
      <button className="panel missions-entry spin-entry" onClick={() => setOpen(true)}>
        <span className="missions-entry-emoji" aria-hidden>
          🎡
        </span>
        <span className="grow">Free spin</span>
        <span className="missions-pill">up to 🪙 {formatCoins(TOP_PRIZE)}</span>
        <span className="missions-chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && <SpinSheet auth={auth} onClose={() => setOpen(false)} />}
    </>
  );
}

/** the wheel: the server picks the slice, the wheel turns to it, then the prize is shown and added */
function SpinSheet({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const [turn, setTurn] = useState(0);
  const [state, setState] = useState<'ready' | 'spinning' | 'done'>('ready');
  const [result, setResult] = useState<SpinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = async () => {
    setState('spinning');
    setError(null);
    try {
      const res = await auth.spin();
      // five full turns, then the chosen slice under the pointer
      setTurn(360 * 5 + (360 - (res.index * SLICE + SLICE / 2)));
      timer.current = setTimeout(() => {
        setResult(res);
        setState('done');
        auth.takeUser(res.user);
      }, SPIN_MS);
    } catch (err) {
      setError((err as Error).message);
      setState('ready');
      void auth.refresh();
    }
  };

  const close = () => {
    // closed mid-spin: the prize is already added, so show the new balance
    if (timer.current && state === 'spinning') void auth.refresh();
    if (timer.current) clearTimeout(timer.current);
    onClose();
  };

  return (
    <Backdrop center onClose={state === 'spinning' ? undefined : close}>
      <div className="reveal popup spin-pop">
        <h3 className="reveal-title">Daily spin</h3>
        <div className="spin-wheel-wrap">
          <i className="spin-pointer" aria-hidden />
          <svg
            className="spin-wheel"
            viewBox="0 0 200 200"
            style={{ transform: `rotate(${turn}deg)`, transitionDuration: `${SPIN_MS}ms` }}
            role="img"
            aria-label="Prize wheel"
          >
            {SPIN_PRIZES.map((p, i) => {
              const a = i * SLICE;
              const mid = a + SLICE / 2;
              return (
                <g key={i}>
                  <path d={`M100 100 L${at(a, 96)} A96 96 0 0 1 ${at(a + SLICE, 96)} Z`} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.35)" />
                  <text
                    x="100"
                    y="30"
                    transform={`rotate(${mid} 100 100)`}
                    textAnchor="middle"
                    className="spin-label"
                  >
                    {p.kind === 'coins' ? (p.amount >= 1000 ? `${p.amount / 1000}K` : p.amount) : `${p.amount}XP`}
                  </text>
                  <text x="100" y="44" transform={`rotate(${mid} 100 100)`} textAnchor="middle" className="spin-icon">
                    {p.kind === 'coins' ? '🪙' : '⭐'}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="14" fill="#1a1a1a" stroke="#d4a017" strokeWidth="3" />
          </svg>
        </div>
        {state === 'done' && result ? (
          <>
            <p className="spin-prize">You won {prizeText(result.prize)}</p>
            <button className="btn primary block" onClick={close}>
              Nice!
            </button>
          </>
        ) : (
          <>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary block shine" disabled={state === 'spinning'} onClick={() => void spin()}>
              {state === 'spinning' ? 'Spinning…' : '🎡 Spin'}
            </button>
            <p className="muted small">One free spin every day · up to 🪙 {formatCoins(TOP_PRIZE)}</p>
          </>
        )}
      </div>
    </Backdrop>
  );
}
