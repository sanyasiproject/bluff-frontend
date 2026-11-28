// One offline game on this phone: the runner ticks here, the online table draws it, and people pass the phone between turns
import { useEffect, useMemo, useRef, useState } from 'react';
import { Toasts } from '../components/Toasts';
import { PluggedTable } from '../games/registry';
import type { Auth } from '../useAuth';
import type { Note } from '../useBluff';
import { OfflineCtx } from './context';
import { startLocal } from './engineBridge';
import type { OfflineSetup } from './games';
import { hostOf, localActions, roomViewOf, type LocalGame } from './localRoom';
import { saveGame } from './store';

const TICK_MS = 100;
const PASS_MS = 1800;

const fakeAuth = (): Auth =>
  new Proxy({ user: null, token: null, checking: false, accountsOn: false, guestsAllowed: true, pushInvites: false, bonus: 0, friendRequests: 0 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : async () => null),
  }) as unknown as Auth;

interface Props {
  setup: OfflineSetup;
  /** a saved game already put back in play */
  resume?: LocalGame;
  onChangePlayers: () => void;
  onExit: () => void;
}

export function OfflineTable({ setup, resume, onChangePlayers, onExit }: Props) {
  // a new game object per round: Play again bumps it
  const [round, setRound] = useState(0);
  const game = useMemo<LocalGame>(() => (round === 0 && resume ? resume : startLocal(setup)), [setup, round]);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [notes, setNotes] = useState<Note[]>([]);
  const toast = (text: string) => setNotes((n) => [...n.slice(-4), { key: Date.now() + Math.random(), kind: 'info', text, at: Date.now() }]);
  const auth = useMemo(fakeAuth, []);
  const people = setup.seats.filter((s) => s.bot === undefined);
  const nameOf = (id: string | null) => setup.seats.find((s) => s.id === id)?.name ?? '';
  const isPerson = (id: string | null) => !!id && people.some((p) => p.id === id);

  // the steps and bots run on a steady clock
  useEffect(() => {
    const t = window.setInterval(() => {
      try {
        if (game.tick(Date.now())) bump();
      } catch (e) {
        console.error('offline tick', e);
      }
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [game]);

  // "me" is the person whose turn it is; between people the last one keeps the phone; at the end the first person
  const turn = game.over() ? null : game.turnId();
  const lastPerson = useRef<string>(hostOf(setup));
  if (isPerson(turn)) lastPerson.current = turn!;
  const meId = game.over() ? hostOf(setup) : lastPerson.current;

  // pass the phone: a short banner when the turn moves from one person to another
  const [pass, setPass] = useState<string | null>(null);
  const prevPerson = useRef<string | null>(null);
  useEffect(() => {
    if (!isPerson(turn) || people.length < 2) return;
    if (prevPerson.current && prevPerson.current !== turn) {
      setPass(turn);
      const t = window.setTimeout(() => setPass(null), PASS_MS);
      prevPerson.current = turn;
      return () => window.clearTimeout(t);
    }
    prevPerson.current = turn;
  }, [turn]);

  // saved to the phone after every change, so closing the app resumes this game
  // the save's time is when play stopped: a resume skips the time the app was closed (clocks don't run)
  const save = () => {
    if (game.over()) return saveGame(null);
    saveGame({ setup, state: game.snapshot(), savedAt: Date.now() });
  };
  useEffect(save, [version, game]);
  useEffect(() => {
    const t = window.setInterval(save, 1000);
    const hide = () => document.visibilityState === 'hidden' && save();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [game]);

  const actions = useMemo(
    () =>
      localActions({
        move: (m) => {
          try {
            game.move(lastPerson.current, m);
            bump();
            return null;
          } catch (e) {
            return e instanceof Error ? e.message : 'That move is not allowed';
          }
        },
        toast,
        playAgain: () => {
          saveGame(null);
          setPass(null);
          prevPerson.current = null;
          lastPerson.current = hostOf(setup);
          setRound((r) => r + 1);
        },
        changePlayers: () => {
          saveGame(null);
          onChangePlayers();
        },
        exit: () => {
          saveGame(null);
          onExit();
        },
      }),
    [game],
  );

  const view = roomViewOf(setup, game, meId);
  const ctx = useMemo(() => ({ fixedBoard: setup.kind === 'chess' && !setup.flip }), [setup]);

  return (
    <OfflineCtx.Provider value={ctx}>
      {/* a fresh table per round so its own effects start over */}
      <PluggedTable key={round} kind={setup.kind} view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />
      <div className="off-badge" aria-label="Offline game: no coins, XP or ratings">
        📴 Offline · <span>no coins, XP or ratings</span>
      </div>
      {pass && (
        <button className="off-pass" onClick={() => setPass(null)} aria-live="assertive">
          <span className="off-pass-card">
            <span className="off-pass-emoji" aria-hidden>
              📱
            </span>
            <b>
              <span data-no-translate>{nameOf(pass)}</span>'s turn
            </b>
            <span className="off-pass-sub">Pass the phone</span>
          </span>
        </button>
      )}
      <Toasts notes={notes} />
    </OfflineCtx.Provider>
  );
}
