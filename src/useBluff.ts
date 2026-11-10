import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inviteCode } from './lib/invite';
import { request, ServerError, socket } from './lib/socket';
import { speak } from './lib/speech';
import { clearSession, loadSavedSession, loadTabSession, saveName, saveSession, type Session } from './lib/storage';
import {
  QUICK_MESSAGES,
  REACTIONS,
  THROWS,
  type Announcement,
  type ChatEvent,
  type Card,
  type ChatKind,
  type GameConfig,
  type GiftEvent,
  type GiftReceived,
  type InviteEvent,
  type Rank,
  type RoomView,
  type ThrowEvent,
} from './types';

export interface Invite extends InviteEvent {
  key: number;
}

export type ConnStatus = 'connecting' | 'online' | 'offline';

export interface Note {
  key: number;
  kind: Announcement['kind'] | 'error' | 'info' | 'chat';
  text: string;
  at: number;
}

/** an emoji, or a quick message, floating up the screen */
export interface Reaction {
  key: number;
  emoji: string;
  /** set for a quick message instead of an emoji */
  text?: string;
  who: string;
  at: number;
}

/** something flying from one person to another: a thrown emoji or gifted coins (member ids) */
export interface Flyer {
  key: number;
  from: string;
  to: string;
  emoji: string;
  count: number;
  /** shown where it lands, e.g. +🪙 50 */
  label?: string;
}

/** a quick message shown as a speech bubble on the sender's seat during a game */
export interface ChatBubble {
  key: number;
  from: string;
  text: string;
  at: number;
}

type Entered = { code: string; token: string };
/** room:join answers pending when a game is running and the host has to say yes */
type JoinReply = { code: string; token?: string; pending?: boolean };

/** waiting for the host to let me watch a game in progress */
export interface PendingWatch {
  code: string;
  name: string;
}

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
  /** id of the current connection; changes only on a real reconnect, so callers can retry once per connection */
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [replaced, setReplaced] = useState(false);
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);
  const pendingRef = useRef<PendingWatch | null>(null);
  const setPending = (p: PendingWatch | null) => {
    pendingRef.current = p;
    setPendingWatch(p);
  };
  const session = useRef<Session | null>(startSession());
  const replacedRef = useRef(false);
  // latest view for socket handlers, which are registered once
  const viewRef = useRef<RoomView | null>(null);

  const pushNote = useCallback((kind: Note['kind'], text: string) => {
    setNotes((prev) => [...prev.slice(-5), { key: ++noteSeq, kind, text, at: Date.now() }]);
  }, []);

  useEffect(() => {
    const onConnect = async () => {
      setStatus('online');
      setConnectionId(socket.id ?? null);
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
    const onDisconnect = () => {
      setStatus('offline');
      // the server forgets a request when the connection drops
      if (pendingRef.current) {
        pushNote('error', 'Connection dropped. Ask to join again');
        setPending(null);
      }
    };
    // the host said yes: take the seat they made for me
    const onAdmitted = async ({ code, token, name }: { code: string; token: string; name: string }) => {
      setPending(null);
      session.current = { code, token, name };
      saveSession(session.current);
      try {
        await request('room:rejoin', { code, token });
      } catch (err) {
        pushNote('error', err instanceof Error ? err.message : 'Could not join');
      }
    };
    const onDenied = ({ code, reason }: { code: string; reason?: string }) => {
      setPending(null);
      pushNote('error', reason ?? `The host didn't let you into room ${code} this time`);
    };
    const onState = (v: RoomView) => {
      viewRef.current = v;
      setView(v);
    };
    const onAnnounce = (n: Announcement) => {
      pushNote(n.kind, n.text);
      if (n.kind !== 'room') speak(n.text);
    };
    // chat is shown, never spoken, so the voice stays for game moves
    const onChat = (c: ChatEvent) => {
      const v = viewRef.current;
      const who =
        c.from === v?.meId ? 'You' : ([...(v?.players ?? []), ...(v?.watchers ?? [])].find((p) => p.id === c.from)?.name ?? 'Someone');
      const text = QUICK_MESSAGES[c.index] ?? '';
      if (c.kind === 'reaction') {
        setReactions((prev) => [...prev.slice(-12), { key: ++noteSeq, emoji: REACTIONS[c.index] ?? '❓', who, at: Date.now() }]);
        return;
      }
      // messages float up like emoji (never the top banner); at the table the sender's seat shows them too
      setReactions((prev) => [...prev.slice(-12), { key: ++noteSeq, emoji: '', text, who, at: Date.now() }]);
      if (v && v.phase !== 'lobby') setBubbles((prev) => [...prev.slice(-10), { key: ++noteSeq, from: c.from, text, at: Date.now() }]);
    };
    const onThrow = (t: ThrowEvent) => {
      setFlyers((prev) => [...prev.slice(-8), { key: ++noteSeq, from: t.from, to: t.to, emoji: THROWS[t.index] ?? '❓', count: 1 }]);
    };
    const onGift = (g: GiftEvent) => {
      setFlyers((prev) => [...prev.slice(-8), { key: ++noteSeq, from: g.from, to: g.to, emoji: '🪙', count: 5, label: `+🪙 ${g.amount}` }]);
    };
    const onGiftReceived = (g: GiftReceived) => pushNote('info', `🎁 ${g.fromName} sent you 🪙 ${g.amount}`);
    const onReplaced = () => {
      replacedRef.current = true;
      setReplaced(true);
    };
    const onKicked = ({ code }: { code: string }) => {
      session.current = null;
      clearSession();
      viewRef.current = null;
      setView(null);
      pushNote('error', `You were removed from room ${code} by the host`);
    };
    // one invite per friend; a newer one replaces the older
    const onInvite = (i: InviteEvent) => {
      setInvites((prev) => [...prev.filter((x) => x.fromId !== i.fromId), { ...i, key: ++noteSeq }]);
    };
    // phones pause sockets in the background; reconnect as soon as the app is visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !socket.connected && !replacedRef.current) socket.connect();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('announce', onAnnounce);
    socket.on('chat', onChat);
    socket.on('throw', onThrow);
    socket.on('gift', onGift);
    socket.on('gift:received', onGiftReceived);
    socket.on('session:replaced', onReplaced);
    socket.on('room:kicked', onKicked);
    socket.on('invite', onInvite);
    socket.on('watch:admitted', onAdmitted);
    socket.on('watch:denied', onDenied);
    document.addEventListener('visibilitychange', onVisible);
    if (socket.connected) void onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('announce', onAnnounce);
      socket.off('chat', onChat);
      socket.off('throw', onThrow);
      socket.off('gift', onGift);
      socket.off('gift:received', onGiftReceived);
      socket.off('room:kicked', onKicked);
      socket.off('invite', onInvite);
      socket.off('watch:admitted', onAdmitted);
      socket.off('watch:denied', onDenied);
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
        run(async () => {
          const res = await request<JoinReply>('room:join', { code, name });
          if (res.pending) setPending({ code: res.code, name });
          else enter({ code: res.code, token: res.token! }, name);
        }),
      cancelWatch: () => {
        setPending(null);
        void request('room:cancelRequest').catch(() => undefined);
      },
      admit: (requestId: string, accept: boolean) => run(() => request('room:admit', { requestId, accept })),
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
          viewRef.current = null;
          setView(null);
        }),
      kick: (memberId: string) => run(() => request('room:kick', { memberId })),
      invite: async (userId: string) => (await run(() => request('friend:invite', { userId }))) !== null,
      dismissInvite: (key: number) => setInvites((prev) => prev.filter((i) => i.key !== key)),
      acceptInvite: (inv: Invite, name: string) =>
        run(async () => {
          setInvites((prev) => prev.filter((i) => i.key !== inv.key));
          const current = viewRef.current;
          if (current?.code === inv.code) return;
          // leave the current room first; the server refuses mid-game
          if (current) {
            try {
              await request('room:leave');
            } catch (err) {
              throw err instanceof ServerError ? new Error('Finish your current game first') : err;
            }
            session.current = null;
            clearSession();
            viewRef.current = null;
            setView(null);
          }
          const res = await request<JoinReply>('room:join', { code: inv.code, name });
          if (res.pending) setPending({ code: res.code, name });
          else enter({ code: res.code, token: res.token! }, name);
        }),
      setConfig: (config: GameConfig) => run(() => request('room:config', config)),
      start: () => run(() => request('room:start')),
      toLobby: () => run(() => request('room:lobby')),
      rematch: () => run(() => request('room:rematch')),
      endGame: () => run(() => request('room:end')),
      makeHost: (memberId: string) => run(() => request('room:host', { memberId })),
      // memberId: the host moving someone else; omitted for yourself
      setWatching: (watching: boolean, memberId?: string) => run(() => request('room:watch', { watching, memberId })),
      play: async (cardIds: string[], rank?: Rank) => (await run(() => request('game:play', { cardIds, rank }))) !== null,
      pass: () => run(() => request('game:pass')),
      bluff: (playId: string, cardIndex?: number, bet = 0) => run(() => request('game:bluff', { playId, cardIndex, bet })),
      /** the card comes back only to me; null if the peek was refused */
      peek: async (playId: string, cardIndex: number) =>
        (await run(() => request<{ card: Card }>('game:peek', { playId, cardIndex })))?.card ?? null,
      shuffleTeams: () => run(() => request('room:teams')),
      moveToSlot: (slot: number) => run(() => request('room:slot', { slot })),
      askSwap: (memberId: string) => run(() => request('room:swap', { memberId })),
      answerSwap: (memberId: string, accept: boolean) => run(() => request('room:swapAnswer', { memberId, accept })),
      chat: (kind: ChatKind, index: number) => run(() => request('chat:send', { kind, index })),
      /** throw an emoji at someone in the room; everyone sees it fly */
      throwAt: (memberId: string, index: number) => run(() => request('chat:throw', { to: memberId, index })),
      dropFlyer: (key: number) => setFlyers((prev) => prev.filter((f) => f.key !== key)),
      reclaim: () => {
        replacedRef.current = false;
        setReplaced(false);
        socket.connect();
      },
      toast: (text: string) => pushNote('info', text),
    };
  }, [run, pushNote]);

  return { status, connectionId, view, notes, reactions, bubbles, flyers, invites, replaced, pendingWatch, actions };
}

export type Actions = ReturnType<typeof useBluff>['actions'];
