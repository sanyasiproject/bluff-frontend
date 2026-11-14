import { useState } from 'react';
import { errorText } from '../lib/api';
import { avatarValue, BACKGROUND_NAMES, backgroundCss, bgUnlocked, characterName, faceUnlocked } from '../lib/avatars';
import { cx } from '../lib/cards';
import { AVATAR_BACKGROUNDS, AVATAR_CHARACTERS, AVATAR_FACES, levelOf, parseAvatar } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { CharacterPic } from './CharacterPic';
import { Backdrop } from './Overlays';

type Tab = 'girl' | 'boy' | 'emoji';
const TABS: { id: Tab; label: string }[] = [
  { id: 'girl', label: '👧 Girls' },
  { id: 'boy', label: '👦 Boys' },
  { id: 'emoji', label: '😎 Emoji' },
];

/** Profile: pick a girl, boy or emoji face and a background; some unlock with level. Everyone in your rooms and friends list sees it */
export function AvatarPicker({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const user = auth.user;
  const level = user ? levelOf(user.stats) : 1;
  const now = parseAvatar(user?.avatar);
  // opens on the tab of the current pick; girls first for a new one
  const [tab, setTab] = useState<Tab>(now ? ('kind' in now.face ? now.face.kind : 'emoji') : 'girl');
  const [face, setFace] = useState<string>(now?.face.id ?? AVATAR_CHARACTERS.find((c) => c.kind === 'girl')!.id);
  const [bg, setBg] = useState<string>(now?.bg.id ?? AVATAR_BACKGROUNDS[0].id);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const value = avatarValue(face, bg);
  const changed = value !== user.avatar;

  const save = async (next: string | null) => {
    setBusy(true);
    setError('');
    try {
      await auth.setAvatar(next);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const pick = (id: string, need: number, name: string) => {
    if (level >= need) {
      setFace(id);
      setHint('');
    } else setHint(`Reach Lv ${need} to unlock ${name}`);
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="avatar-picker">
        <h3>Your avatar</h3>
        <div className="avatar-preview">
          {/* re-keyed so it pops on every change */}
          <Avatar key={value} name={user.displayName} avatar={value} size="xl" />
          <p className="muted small">Everyone at your table and in your friends list sees it</p>
        </div>

        <div className="av-tabs" role="tablist" aria-label="Kind of avatar">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cx('av-tab', tab === t.id && 'on')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'emoji' ? (
          <div className="face-grid" role="radiogroup" aria-label="Face">
            {AVATAR_FACES.map((f) => {
              const open = faceUnlocked(f, level);
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={face === f.id}
                  aria-label={open ? f.id : `${f.id}, unlocks at level ${f.level}`}
                  className={cx('face-btn', face === f.id && 'on', !open && 'locked')}
                  onClick={() => pick(f.id, f.level, f.emoji)}
                >
                  <span className="face-emoji">{f.emoji}</span>
                  {!open && <span className="face-lock">🔒 {f.level}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="char-grid" role="radiogroup" aria-label={tab === 'girl' ? 'Girls' : 'Boys'}>
            {AVATAR_CHARACTERS.filter((c) => c.kind === tab).map((c) => {
              const open = faceUnlocked(c, level);
              const name = characterName(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={face === c.id}
                  aria-label={open ? name : `${name}, unlocks at level ${c.level}`}
                  className={cx('char-btn', face === c.id && 'on', !open && 'locked')}
                  onClick={() => pick(c.id, c.level, name)}
                >
                  {/* shown on the background you picked */}
                  <span className="char-pic" style={{ background: backgroundCss(bg) }}>
                    <CharacterPic id={c.id} />
                  </span>
                  <span className="char-name">{open ? name : `🔒 Lv ${c.level}`}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="label">Background</p>
        <div className="bg-row" role="radiogroup" aria-label="Background">
          {AVATAR_BACKGROUNDS.map((b) => {
            const open = bgUnlocked(b, level);
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={bg === b.id}
                aria-label={open ? BACKGROUND_NAMES[b.id] : `${BACKGROUND_NAMES[b.id]}, unlocks at level ${b.level}`}
                className={cx('bg-swatch', bg === b.id && 'on', !open && 'locked')}
                onClick={() => (open ? (setBg(b.id), setHint('')) : setHint(`Reach Lv ${b.level} to unlock ${BACKGROUND_NAMES[b.id]}`))}
              >
                <span className="bg-dot" style={{ background: backgroundCss(b.id) }}>
                  {!open && '🔒'}
                </span>
                <span className="bg-name">{open ? BACKGROUND_NAMES[b.id] : `Lv ${b.level}`}</span>
              </button>
            );
          })}
        </div>

        {hint && <p className="avatar-hint">{hint}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary block" disabled={busy || !changed} onClick={() => void save(value)}>
          {busy ? 'Saving…' : changed ? 'Save avatar' : 'This is your avatar'}
        </button>
        {user.avatar && (
          <button className="link-btn" disabled={busy} onClick={() => void save(null)}>
            Use my letter instead
          </button>
        )}
      </div>
    </Backdrop>
  );
}
