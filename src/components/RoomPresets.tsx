// Host: ⭐ save the lobby's settings as a named preset and pick one later (on the account when logged in, else on this phone)
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, errorText } from '../lib/api';
import { gameInfo, PRESET_NAME_MAX, PRESETS_PER_GAME, type GameConfig, type PresetsResponse, type RoomPreset, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';
import { Backdrop } from './Overlays';

const LOCAL_KEY = 'bluff.presets';

function localList(): RoomPreset[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as RoomPreset[];
    return Array.isArray(v) ? v.filter((p) => p && typeof p.id === 'string' && p.config) : [];
  } catch {
    return [];
  }
}
const localSave = (all: RoomPreset[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // storage full or blocked
  }
};

/** presets for one game: the account's from the server, a guest's from this phone */
function usePresets(auth: Auth, game: GameConfig['game']) {
  const [list, setList] = useState<RoomPreset[] | null>(null);
  const [error, setError] = useState('');
  const token = auth.user ? auth.token : null;
  useEffect(() => {
    setError('');
    if (!token) return setList(localList().filter((p) => p.game === game));
    let live = true;
    api<PresetsResponse>(`/me/presets?game=${game}`, { token })
      .then((r) => live && setList(r.presets))
      .catch((e) => live && (setError(errorText(e)), setList([])));
    return () => {
      live = false;
    };
  }, [token, game]);

  const save = async (name: string, config: GameConfig, bots: number) => {
    setError('');
    if (token) {
      try {
        setList((await api<PresetsResponse>('/me/presets', { token, body: { name, config, bots } })).presets);
        return true;
      } catch (e) {
        setError(errorText(e));
        return false;
      }
    }
    const all = localList();
    const same = all.find((p) => p.game === game && p.name === name);
    if (!same && all.filter((p) => p.game === game).length >= PRESETS_PER_GAME) {
      setError(`Up to ${PRESETS_PER_GAME} presets per game: delete one first`);
      return false;
    }
    const preset: RoomPreset = { id: same?.id ?? `local-${Date.now().toString(36)}`, name, game, config, bots, updatedAt: new Date().toISOString() };
    const next = [...all.filter((p) => p.id !== preset.id), preset];
    localSave(next);
    setList(next.filter((p) => p.game === game));
    return true;
  };

  const remove = async (id: string) => {
    setError('');
    if (token) {
      try {
        const r = await api<PresetsResponse | undefined>(`/me/presets/${id}`, { token, method: 'DELETE' });
        setList(r?.presets ?? (list ?? []).filter((p) => p.id !== id));
      } catch (e) {
        setError(errorText(e));
      }
      return;
    }
    const next = localList().filter((p) => p.id !== id);
    localSave(next);
    setList(next.filter((p) => p.game === game));
  };
  return { list, error, save, remove };
}

/** the host's ⭐ Presets button and its sheet: save these settings, or apply a saved set */
export function PresetsButton({ view, actions, auth }: { view: RoomView; actions: Actions; auth: Auth }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="room-gear ghost presets-btn" onClick={() => setOpen(true)}>
        ⭐ Presets
      </button>
      {/* out of the tilted table, so the popup sits flat on the screen */}
      {open && createPortal(<PresetsSheet view={view} actions={actions} auth={auth} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function PresetsSheet({ view, actions, auth, onClose }: { view: RoomView; actions: Actions; auth: Auth; onClose: () => void }) {
  const game = view.config.game;
  const { list, error, save, remove } = usePresets(auth, game);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const bots = view.players.filter((p) => p.bot).length;
  const apply = async (p: RoomPreset) => {
    setBusy(true);
    await actions.setConfig({ ...p.config, game });
    // seat the preset's bots in free seats
    const free = Math.max(0, gameInfo(game).maxPlayers - view.players.length);
    for (let i = 0; i < Math.min(free, p.bots - bots); i++) await actions.addBot();
    setBusy(false);
    actions.toast(`⭐ ${p.name} applied`);
    onClose();
  };
  return (
    <Backdrop center onClose={onClose} panel="presets-sheet">
      <h3>⭐ Presets · {gameInfo(game).name}</h3>
      <p className="muted small">{auth.user ? 'Saved to your account' : 'Saved on this phone (log in to keep them on your account)'}</p>
      <div className="preset-save">
        <input
          className="preset-name"
          value={name}
          maxLength={PRESET_NAME_MAX}
          placeholder="Name, e.g. Family night"
          aria-label="Preset name"
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn primary"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true);
            if (await save(name.trim(), view.config, bots)) {
              setName('');
              actions.toast('⭐ Settings saved');
            }
            setBusy(false);
          }}
        >
          ⭐ Save these settings
        </button>
      </div>
      {error && <p className="pin-wrong small">{error}</p>}
      {list === null ? (
        <p className="muted small">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted small">No presets for this game yet.</p>
      ) : (
        <ul className="preset-list">
          {list.map((p) => (
            <li key={p.id}>
              <button className="btn grow preset-apply" disabled={busy} onClick={() => void apply(p)}>
                <b data-no-translate>{p.name}</b>
                {p.bots > 0 && <small> · 🤖 {p.bots}</small>}
              </button>
              <button className="icon-btn" aria-label="Delete preset" disabled={busy} onClick={() => void remove(p.id)}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </Backdrop>
  );
}
