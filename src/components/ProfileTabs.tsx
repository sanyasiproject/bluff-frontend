import { useState } from 'react';
import { cx } from '../lib/cards';

export type ProfileTab = 'stats' | 'social' | 'looks' | 'settings';

const TABS: { id: ProfileTab; emoji: string; label: string }[] = [
  { id: 'stats', emoji: '📊', label: 'Stats' },
  { id: 'social', emoji: '👥', label: 'Social' },
  { id: 'looks', emoji: '🎨', label: 'Looks' },
  { id: 'settings', emoji: '⚙️', label: 'Settings' },
];

/** the last tab opened, remembered on this phone */
const KEY = 'bluff.profileTab';

const isTab = (v: string | null): v is ProfileTab => TABS.some((t) => t.id === v);

function loadTab(): ProfileTab {
  try {
    const v = localStorage.getItem(KEY);
    return isTab(v) ? v : 'stats';
  } catch {
    return 'stats';
  }
}

function saveTab(tab: ProfileTab): void {
  try {
    localStorage.setItem(KEY, tab);
  } catch {
    // private mode or blocked storage: just not remembered
  }
}

/** the profile's open tab, starting from the one used last on this phone */
export function useProfileTab(): [ProfileTab, (tab: ProfileTab) => void] {
  const [tab, setTab] = useState<ProfileTab>(loadTab);
  const pick = (next: ProfileTab) => {
    setTab(next);
    saveTab(next);
  };
  return [tab, pick];
}

interface Props {
  tab: ProfileTab;
  onPick: (tab: ProfileTab) => void;
  /** a red count on Social: friend requests waiting */
  requests?: number;
}

/** Stats · Social · Looks · Settings, sticky under the profile header */
export function ProfileTabs({ tab, onPick, requests = 0 }: Props) {
  return (
    <nav className="profile-tabs" role="tablist" aria-label="Profile sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          className={cx(tab === t.id && 'on')}
          onClick={() => onPick(t.id)}
        >
          <span aria-hidden>{t.emoji}</span>
          {t.label}
          {t.id === 'social' && requests > 0 && <i className="req-dot">{requests}</i>}
        </button>
      ))}
    </nav>
  );
}
