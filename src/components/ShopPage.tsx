import { AuraCanvas } from './AuraCanvas';
import { Backdrop } from './Overlays';
import { PlayingCard } from './PlayingCard';
import { previewShopFx } from './ShopFx';
import { Seat } from './Table';
import type { PublicPlayer } from '../types';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApiError, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { confetti, useCountUp } from '../lib/motion';
import { useNow } from '../lib/useNow';
import { MAX_SHIELDS, MIN_REWARD_GAME_SEC, SHOP_ITEMS, shopItemOf, type ShopItem, type ShopKind, type ShopLookKind, type ShopResponse } from '../types';
import type { Auth } from '../useAuth';
import { ConfirmBox } from './ConfirmBox';
import { FullPage } from './FullPage';

const HOUR_MS = 3_600_000;

/** time left as "2d 4h", "5h 20m" or "12m" */
function leftText(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

const daysText = (days: number) => (days === 1 ? '1 day' : `${days} days`);

/** the length badge: "1.25x · 1 day", "+25% · 7 days" or "7 days" */
function lengthBadge(item: ShopItem): string {
  if (item.kind === 'xp' && item.mult) return `${item.mult}x · ${daysText(item.days)}`;
  if (item.kind === 'coins' && item.mult) return `+${Math.round((item.mult - 1) * 100)}% · ${daysText(item.days)}`;
  if (item.kind === 'shield') return '1 loss';
  return daysText(item.days);
}

const isLook = (kind: ShopKind): kind is ShopLookKind => kind === 'aura' || kind === 'win' || kind === 'entry';

interface SectionDef {
  kind: ShopKind;
  title: string;
  note: string;
}

const SECTIONS: readonly SectionDef[] = [
  { kind: 'xp', title: '⚡ XP boosts', note: `Games of ${MIN_REWARD_GAME_SEC / 60} min or more · one at a time` },
  { kind: 'coins', title: '🪙 Coin boost', note: 'Daily ladder and mission coins · one at a time' },
  { kind: 'shield', title: '🛡️ Rank protection', note: `Ranked games · used up on your next ranked loss · hold up to ${MAX_SHIELDS}` },
  { kind: 'aura', title: '✨ Auras', note: 'On your seat, card backs and profile, for everyone' },
  { kind: 'win', title: '🎆 Win bursts', note: 'Everyone sees it when you win' },
  { kind: 'entry', title: '🚪 Entry flashes', note: 'Plays when you join a table' },
];

/** the preview tile: a live aura swatch, or the item's emoji */
function ShopTile({ item }: { item: ShopItem }) {
  if (item.kind === 'aura') {
    return (
      <div className="shop-tile aura aura-live" aria-hidden>
        <AuraCanvas aura={item.id} pad={6} />
        <span className="shop-tile-emoji">{item.emoji}</span>
      </div>
    );
  }
  return (
    <div className={cx('shop-tile', item.kind)} aria-hidden>
      <span className="shop-tile-emoji">{item.emoji}</span>
    </div>
  );
}

interface CardProps {
  /** Rank Shields held (shield card only) */
  held?: number;
  /** see the look before buying: an aura on your own seat, or the burst played on screen */
  onPreview: (item: ShopItem) => void;
  item: ShopItem;
  index: number;
  coins: number;
  /** when this rental runs out; null when not running */
  until: number | null;
  now: number;
  /** others see this look on me */
  worn: boolean;
  busy: boolean;
  /** the server's reason the last try on this item failed */
  error: string | null;
  onRent: (item: ShopItem, el: HTMLElement) => void;
  onWear: (item: ShopItem, on: boolean) => void;
}

/** one shop item: tile, words, price and what can be done with it now */
function ShopCard({ item, index, coins, until, now, worn, busy, error, onRent, onWear, onPreview, held = 0 }: CardProps) {
  const shield = item.kind === 'shield';
  const running = !shield && until !== null && until > now;
  const short = Math.max(0, item.price - coins);
  const full = shield && held >= MAX_SHIELDS;
  const rentLabel = shield ? 'Buy' : running ? `Add ${daysText(item.days)}` : 'Rent';
  return (
    <li className={cx('shop-card', running && 'running', worn && 'worn')} style={{ '--i': index } as CSSProperties}>
      <ShopTile item={item} />
      <div className="shop-card-main">
        <div className="shop-card-top">
          <b className="shop-card-name">{item.name}</b>
          <span className="shop-len">{lengthBadge(item)}</span>
        </div>
        <p className="shop-card-desc">{item.desc}</p>
        {shield && (
          <p className="shop-card-state">
            <span className={held > 0 ? 'shop-on' : 'shop-off'}>
              🛡️ You have {held}/{MAX_SHIELDS}
            </span>
          </p>
        )}
        {running && (
          <p className="shop-card-state">
            {worn ? <span className="shop-wearing">✓ Wearing</span> : isLook(item.kind) ? <span className="shop-off">Not on</span> : <span className="shop-on">● On</span>}
            <span className="shop-left">{leftText((until ?? now) - now)} left</span>
          </p>
        )}
        {error && <p className="shop-card-error">{error}</p>}
        <div className="shop-card-actions">
          <button
            type="button"
            className={cx('btn', 'shop-rent', !running && 'primary')}
            disabled={busy || short > 0 || full}
            onClick={(e) => onRent(item, e.currentTarget)}
          >
            {rentLabel} · 🪙 {formatCoins(item.price)}
          </button>
          {running && isLook(item.kind) && (
            <button type="button" className={cx('btn', 'shop-wear', worn ? 'ghost' : 'primary')} disabled={busy} onClick={() => onWear(item, !worn)}>
              {worn ? 'Take off' : 'Wear'}
            </button>
          )}
          {isLook(item.kind) && (
            <button type="button" className="btn ghost shop-preview" onClick={() => onPreview(item)}>
              ▶ Preview
            </button>
          )}
        </div>
        {short > 0 && <p className="shop-need">Need 🪙 {formatCoins(short)} more</p>}
      </div>
    </li>
  );
}

/** the "Running now" strip: every rental still going, soonest to end first */
function RunningStrip({ data, now }: { data: ShopResponse; now: number }) {
  const list = data.active.flatMap((r) => {
    const item = shopItemOf(r.id);
    const until = Date.parse(r.until);
    return item && until > now ? [{ item, until }] : [];
  });
  const shields = data.shields ?? 0;
  if (list.length === 0 && shields === 0) return <p className="shop-running-empty muted small">Nothing running. Rent something below.</p>;
  return (
    <section className="shop-running" aria-label="Running now">
      <h3 className="shop-running-title">Running now</h3>
      <ul className="shop-running-list">
        {shields > 0 && (
          <li className="shop-chip">
            <span className="shop-chip-emoji" aria-hidden>
              🛡️
            </span>
            <span className="shop-chip-text">
              <b>Rank Shield ×{shields}</b>
              <small>next ranked loss</small>
            </span>
          </li>
        )}
        {list.map(({ item, until }) => {
          const worn = isLook(item.kind) && data.wearing[item.kind] === item.id;
          return (
            <li key={item.id} className={cx('shop-chip', until - now < HOUR_MS * 6 && 'ending')}>
              <span className="shop-chip-emoji" aria-hidden>
                {item.emoji}
              </span>
              <span className="shop-chip-text">
                <b>
                  {item.name}
                  {worn && ' ✓'}
                </b>
                <small>{leftText(until - now)} left</small>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface Props {
  auth: Auth;
  onClose: () => void;
  /** the shop the caller already has, shown until a fresh copy arrives */
  initial?: ShopResponse | null;
  /** every fresh copy, so the caller's pill stays right */
  onChange?: (s: ShopResponse) => void;
}

/** the coin shop: balance, what's running, and every item to rent */
export function ShopPage({ auth, onClose, initial = null, onChange }: Props) {
  const [data, setData] = useState<ShopResponse | null>(initial);
  const [error, setError] = useState('');
  /** the item waiting for a yes before it's bought */
  const [asking, setAsking] = useState<{ item: ShopItem; el: HTMLElement } | null>(null);
  const [busy, setBusy] = useState(false);
  /** the server's reason one item's last try failed */
  const [cardError, setCardError] = useState<{ id: string; text: string } | null>(null);
  /** short "done" note at the bottom */
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const now = useNow(30_000);
  /** an aura shown on my own seat before buying */
  const [peek, setPeek] = useState<ShopItem | null>(null);
  const preview = (item: ShopItem) => (item.kind === 'aura' ? setPeek(item) : previewShopFx(item.id, `${item.emoji} ${item.name} · preview`));
  const changed = useRef(onChange);
  changed.current = onChange;

  const got = (s: ShopResponse) => {
    setData(s);
    changed.current?.(s);
  };

  const load = () => {
    auth
      .shop()
      .then((s) => {
        setError('');
        got(s);
      })
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'The shop is coming soon. Try again later.' : errorText(err)));
  };

  useEffect(load, []);

  // the toast goes by itself
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // a rental ran out while the page is open: read the shop again so looks and boosts are right
  const nextEnd = data ? Math.min(...data.active.map((r) => Date.parse(r.until)).filter((t) => !Number.isNaN(t))) : Infinity;
  useEffect(() => {
    if (Number.isFinite(nextEnd) && now >= nextEnd) load();
  }, [now, nextEnd]);

  const coins = auth.user?.coins ?? data?.coins ?? 0;
  const shown = useCountUp(coins, 700);

  const say = (text: string) => setToast({ text, key: Date.now() });

  const rent = async (item: ShopItem, el: HTMLElement) => {
    setAsking(null);
    setCardError(null);
    setBusy(true);
    try {
      got(await auth.buyShop(item.id));
      const box = el.getBoundingClientRect();
      confetti(box.left + box.width / 2, box.top + box.height / 2, { count: 28, spread: 0.8 });
      say(item.kind === 'shield' ? `🛡️ Rank Shield added` : `${item.emoji} ${item.name}: ${daysText(item.days)} added`);
    } catch (err) {
      setCardError({ id: item.id, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const wear = async (item: ShopItem, on: boolean) => {
    if (!isLook(item.kind)) return;
    setCardError(null);
    setBusy(true);
    try {
      got(await auth.wearShop(item.kind, on ? item.id : null));
      say(on ? `${item.emoji} ${item.name} is on` : `${item.name} taken off`);
    } catch (err) {
      setCardError({ id: item.id, text: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  const untilOf = (id: string) => {
    const r = data?.active.find((a) => a.id === id);
    const t = r ? Date.parse(r.until) : NaN;
    return Number.isNaN(t) ? null : t;
  };
  const askingRunning = asking ? (untilOf(asking.item.id) ?? 0) > now : false;

  return (
    <FullPage title="Coin shop" onBack={onClose} className="lp-split lp-shop">
      {/* sideways: coins and what's running on the left, the shelves on the right */}
      <aside className="lp-rail">
        <section className="shop-hero">
          <span className="shop-hero-label">Your coins</span>
          <b className="shop-hero-coins">
            <span aria-hidden>🪙</span> {formatCoins(shown)}
          </b>
          <span className="shop-hero-note">Rent for a day or a week. Nothing is kept for good.</span>
        </section>
        {error && <p className="form-error">{error}</p>}
        {!data && !error && <p className="muted small">Loading…</p>}
        {error && !data && (
          <button className="btn ghost block" onClick={load}>
            Try again
          </button>
        )}
        {data && <RunningStrip data={data} now={now} />}
      </aside>
      <div className="lp-main">
        {data && (
          <>
            {SECTIONS.map((sec) => {
              const items = SHOP_ITEMS.filter((i) => i.kind === sec.kind);
              if (items.length === 0) return null;
              return (
                <section key={sec.kind} className={cx('shop-section', sec.kind)}>
                  <div className="shop-section-head">
                    <h3 className="section-title">{sec.title}</h3>
                    <p className="shop-section-note">{sec.note}</p>
                  </div>
                  <ul className="shop-list">
                    {items.map((item, i) => (
                      <ShopCard
                        key={item.id}
                        item={item}
                        index={i}
                        coins={coins}
                        until={untilOf(item.id)}
                        now={now}
                        worn={isLook(item.kind) && data.wearing[item.kind] === item.id}
                        busy={busy}
                        error={cardError?.id === item.id ? cardError.text : null}
                        onRent={(it, el) => setAsking({ item: it, el })}
                        onWear={(it, on) => void wear(it, on)}
                        onPreview={preview}
                        held={data.shields ?? 0}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
            <p className="shop-foot muted small">Buying again adds time, up to 28 days ahead. One XP boost and one coin boost at a time.</p>
          </>
        )}
      </div>
      {toast && (
        <div key={toast.key} className="shop-toast" role="status">
          {toast.text}
        </div>
      )}
      {peek && <AuraPreview item={peek} auth={auth} onClose={() => setPeek(null)} />}
      {asking && (
        <ConfirmBox
          title={
            asking.item.kind === 'shield'
              ? `Buy a 🛡️ Rank Shield for 🪙 ${formatCoins(asking.item.price)}?`
              : askingRunning
              ? `Add ${daysText(asking.item.days)} to ${asking.item.emoji} ${asking.item.name} for 🪙 ${formatCoins(asking.item.price)}?`
              : `Rent ${asking.item.emoji} ${asking.item.name} for 🪙 ${formatCoins(asking.item.price)}?`
          }
          body={
            asking.item.kind === 'shield'
              ? `Your next ranked loss costs no rank points; the shield is used up on that loss. You hold ${data?.shields ?? 0} now.`
              : askingRunning
              ? `Adds ${daysText(asking.item.days)} to the time left. Nothing is kept for good.`
              : `Lasts ${daysText(asking.item.days)}. Buying again adds time. Nothing is kept for good.`
          }
          action={asking.item.kind === 'shield' ? 'Buy' : askingRunning ? 'Add time' : 'Rent'}
          danger={false}
          onConfirm={() => void rent(asking.item, asking.el)}
          onCancel={() => setAsking(null)}
        />
      )}
    </FullPage>
  );
}

/** the 🛍️ Coin shop button with what's running; hidden for guests and for a server without a shop */
export function ShopButton({ auth, online = true }: { auth: Auth; online?: boolean }) {
  const userId = auth.user?.id ?? null;
  /** null until loaded; 'off' when the server has no shop yet */
  const [shop, setShop] = useState<ShopResponse | 'off' | null>(null);
  const [open, setOpen] = useState(false);
  const now = useNow(60_000);

  // another account: forget the old shop
  useEffect(() => setShop(null), [userId]);
  // load it, again once a waking server answers
  useEffect(() => {
    if (!userId || !online) return;
    let live = true;
    auth
      .shop()
      .then((s) => live && setShop(s))
      .catch((err) => {
        if (live && err instanceof ApiError && err.status === 404) setShop('off');
      });
    return () => {
      live = false;
    };
  }, [userId, online]);

  if (!userId || (shop === 'off' && !open)) return null;
  const running = shop && shop !== 'off' ? shop.active.filter((r) => Date.parse(r.until) > now).length : 0;
  const coins = auth.user?.coins;
  return (
    <>
      <button className="panel shop-entry" onClick={() => setOpen(true)}>
        <span className="shop-entry-emoji" aria-hidden>
          🛍️
        </span>
        <span className="grow">Coin shop</span>
        {running > 0 ? (
          <span className="shop-entry-pill on">{running} running</span>
        ) : (
          typeof coins === 'number' && <span className="shop-entry-pill">🪙 {compactCoins(coins)}</span>
        )}
        <span className="shop-entry-chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && <ShopPage auth={auth} initial={shop === 'off' ? null : shop} onChange={setShop} onClose={() => setOpen(false)} />}
    </>
  );
}

/** an aura on my own seat, card back and profile card, exactly as others will see it */
function AuraPreview({ item, auth, onClose }: { item: ShopItem; auth: Auth; onClose: () => void }) {
  const u = auth.user;
  const me: PublicPlayer = {
    id: 'preview',
    name: u?.displayName ?? 'You',
    avatar: u?.avatar ?? null,
    back: u?.cardBack ?? 'classic',
    table: u?.tableTheme ?? 'classic',
    cardCount: 13,
    handValue: null,
    connected: true,
    place: null,
    registered: true,
    coins: null,
    username: u?.username ?? null,
    level: null,
    bot: false,
    ready: true,
    saza: null,
    shop: { aura: item.id, win: null, entry: null },
  };
  return (
    <Backdrop onClose={onClose}>
      <h3>
        {item.emoji} {item.name}
      </h3>
      <div className="aura-preview">
        <div className="aura-preview-row">
          <Seat player={me} turn={false} passed={false} viewing={false} action={null} bubble={null} label="" />
          <PlayingCard faceDown size="md" back={me.back} aura={item.id} />
        </div>
        <div className="player-card aura-live aura-card" style={{ width: '100%' }}>
          <AuraCanvas aura={item.id} pad={16} />
          <b>{me.name}</b>
          <span className="aura-preview-note">Your profile card</span>
        </div>
        <p className="aura-preview-note">Everyone at your table sees this. Never the same twice.</p>
      </div>
      <button type="button" className="btn block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
