import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inviteCode } from './lib/invite';
import { request, ServerError, socket } from './lib/socket';
import { speak } from './lib/speech';
import { clearSession, loadSavedSession, loadTabSession, saveName, saveSession, type Session } from './lib/storage';
import type { Announcement, GameConfig, Rank, RoomView } from './types';

export type ConnStatus = 'connecting' | 'online' | 'offline';

export interface Note {
  key: number;
  kind: Announcement['kind'] | 'error' | 'info';
  text: string;
  at: number;
}

type Entered = { code: string; token: string };

let noteSeq = 0;

/** an invite link to a different room wins over this tab's old seat */
function startSession(): Session | null {
  const s = loadTabSession();
  const invite = inviteCode();
  return s && invite && s.code !== invite ? null : s;
}

/** Connection, room state and every player action in one place */
export function useBluff() {
  const [status, setStatus] = useState<ConnStatus>(socket.connected ? 'online' : 'connecting');
  const [view, setView] = useState<RoomView | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [replaced, setReplaced] = useState(false);
  const session = useRef<Session | null>(startSession());
  const replacedRef = useRef(false);

  const pushNote = useCallback((kind: Note['kind'], text: string) => {
    setNotes((prev) => [...prev.slice(-5), { key: ++noteSeq, kind, text, at: Date.now() }]);
  }, []);

  useEffect(() => {
    const onConnect = async () => {
      setStatus('online');
      const s = session.current;
      if (!s) return;
      try {
        await request('room:rejoin', { code: s.code, token: s.token });
      } catch (err) {
        // the room is gone (e.g. server restarted): go back home
        if (err instanceof ServerError) {
          session.current = null;
          clearSession();
          setView(null);
          pushNote('error', err.message);
        }
      }
    };
    const onDisconnect = () => setStatus('offline');
    const onState = (v: RoomView) => setView(v);
    const onAnnounce = (n: Announcement) => {
      pushNote(n.kind, n.text);
      if (n.kind !== 'room') speak(n.text);
    };
    const onReplaced = () => {
      replacedRef.current = true;
      setReplaced(true);
    };
    // phones pause sockets in the background; reconnect as soon as the app is visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socket.connected && !replacedRef.current) socket.connect();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('announce', onAnnounce);
    socket.on('session:replaced', onReplaced);
    document.addEventListener('visibilitychange', onVisible);
    if (socket.connected) void onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('announce', onAnnounce);
      socket.off('session:replaced', onReplaced);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pushNote]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (err) {
        pushNote('error', err instanceof Error ? err.message : 'Something went wrong');
        return null;
      }
    },
    [pushNote],
  );

  const actions = useMemo(() => {
    const enter = (res: Entered, name: string) => {
      session.current = { code: res.code, token: res.token, name };
      saveSession(session.current);
      saveName(name);
    };
    return {
      create: (name: string) => run(async () => enter(await request<Entered>('room:create', { name }), name)),
      join: (code: string, name: string) =>
        run(async () => enter(await request<Entered>('room:join', { code, name }), name)),
      rejoinSaved: () =>
        run(async () => {
          const s = loadSavedSession();
          if (!s) return;
          try {
            await request('room:rejoin', { code: s.code, token: s.token });
          } catch (err) {
            if (err instanceof ServerError) clearSession();
            throw err;
          }
          session.current = s;
          saveSession(s);
        }),
      leave: () =>
        run(async () => {
          await request('room:leave');
          session.current = null;
          clearSession();
          setView(null);
        }),
      setConfig: (config: GameConfig) => run(() => request('room:config', config)),
      start: () => run(() => request('room:start')),
      toLobby: () => run(() => request('room:lobby')),
      play: async (cardIds: string[], rank?: Rank) => (await run(() => request('game:play', { cardIds, rank }))) !== null,
      pass: () => run(() => request('game:pass')),
      bluff: (playId: string, cardIndex?: number) => run(() => request('game:bluff', { playId, cardIndex })),
      reclaim: () => {
        replacedRef.current = false;
        setReplaced(false);
        socket.connect();
      },
      toast: (text: string) => pushNote('info', text),
    };
  }, [run, pushNote]);

  return { status, view, notes, replaced, actions };
}

export type Actions = ReturnType<typeof useBluff>['actions'];
