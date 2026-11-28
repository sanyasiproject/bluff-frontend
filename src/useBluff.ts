import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inviteCode } from './lib/invite';
import { pushPileReaction } from './lib/pileReactions';
import { request, ServerError, setRejoining, socket } from './lib/socket';
import { speak, speakLine, voiceShiftOf } from './lib/speech';
import { clearSession, loadSavedSession, loadTabSession, saveName, saveSession, type Session } from './lib/storage';
import {
  chatSetOf,
  SERVER_RESTART_TEXT,
  speaksQuickChat,
  THROWS,
  type Announcement,
  type ChatEvent,
  type Card,
  type ChatKind,
  type GameConfig,
  type GameKind,
  type GiftEvent,
  type GiftReceived,
  type InviteEvent,
  type LudoLookChoice,
  type PlayerPlays,
  type PluggedMove,
  type Rank,
  type RangColor,
  type Suit,
  type RoomView,
  type SazaBadge,
  type ThrowEvent,
  type ServerRestarting,
} from './types';
import { mutedMember } from './lib/mute';
import { resetServerClock, sampleServerTime, sampleView } from './lib/serverClock';
import { sfx } from './lib/sounds';

export interface Invite extends InviteEvent {
  key: number;
}

export type ConnStatus = 'connecting' | 'online' | 'offline';

export interface Note {
  key: number;
  kind: Announcement['kind'] | 'error' | 'info' | 'chat';
  text: string;
  at: number;
  /** a forfeit or a stopped game: shown even at a table that keeps routine moves quiet */
  loud?: boolean;
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
type JoinReply = { code: string; token?: string; pending?: boolean; askedOf?: string };

/** waiting to be let in: by the friend I asked, or the host of a game in progress */
export interface PendingWatch {
  code: string;
  name: string;
  /** the friend I asked; missing: the host */
  askedOf?: string;
}

/** the host's get-ready buzz: who sent it; key changes on every buzz */
export interface Nudged {
  from: string;
  key: number;
}

let noteSeq = 0;

/** waits between rejoin tries when the server doesn't answer (then a fresh connection) */
const REJOIN_BACKOFF_MS = [1000, 2000, 4000, 8000];
const wait = (ms: number) => new Promise<void>((done) => window.setTimeout(done, ms));

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
  /** room code + connection of the last view: changes on entering a room and on every rejoin */
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const roomKeyRef = useRef<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [replaced, setReplaced] = useState(false);
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);
  /** the host buzzed me to get ready (lobby) */
  const [nudged, setNudged] = useState<Nudged | null>(null);
  const pendingRef = useRef<PendingWatch | null>(null);
  /** a reconnect is putting me back in my seat; moves wait until it is done */
  const [rejoining, setRejoiningState] = useState(false);
  /** the server restarted and my game couldn't be brought back */
  const [lostGame, setLostGame] = useState(false);
  const rejoinGen = useRef(0);
  const restartSeen = useRef(false);
  const setPending = (p: PendingWatch | null) => {
    pendingRef.current = p;
    setPendingWatch(p);
  };
  const session = useRef<Session | null>(startSession());
  const replacedRef = useRef(false);
  // latest view for socket handlers, which are registered once
  const viewRef = useRef<RoomView | null>(null);
  /** Create a room from a Home game tile: the game the new room should start in */
  const wantGame = useRef<GameKind | null>(null);

  const pushNote = useCallback((kind: Note['kind'], text: string, loud = false) => {
    setNotes((prev) => [...prev.slice(-5), { key: ++noteSeq, kind, text, at: Date.now(), ...(loud && { loud }) }]);
  }, []);

  useEffect(() => {
    const markRejoining = (gen: number, on: boolean) => {
      if (gen !== rejoinGen.current) return;
      setRejoining(on);
      setRejoiningState(on);
    };
    const onConnect = async () => {
      setStatus('online');
      setConnectionId(socket.id ?? null);
      const s = session.current;
      if (!s) {
        restartSeen.current = false;
        return;
      }
      const gen = ++rejoinGen.current;
      markRejoining(gen, true);
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            await request('room:rejoin', { code: s.code, token: s.token });
            restartSeen.current = false;
            return;
          } catch (err) {
            if (gen !== rejoinGen.current || !socket.connected) return;
            // the room is gone (e.g. server restarted): go back home
            if (err instanceof ServerError) {
              const hadGame = viewRef.current !== null || restartSeen.current;
              restartSeen.current = false;
              session.current = null;
              clearSession();
              viewRef.current = null;
              setView(null);
              if (hadGame) setLostGame(true);
              else pushNote('error', err.message);
              return;
            }
            // no answer: try again later, then on a fresh connection (which rejoins again)
            const delay = REJOIN_BACKOFF_MS[attempt];
            if (delay === undefined) {
              socket.disconnect();
              socket.connect();
              return;
            }
            await wait(delay);
            if (gen !== rejoinGen.current || !socket.connected) return;
          }
        }
      } finally {
        markRejoining(gen, false);
      }
    };
    const onDisconnect = () => {
      setStatus('offline');
      // any rejoin in flight belongs to the old connection
      rejoinGen.current++;
      setRejoining(false);
      setRejoiningState(false);
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
      const who = pendingRef.current?.askedOf ?? 'The host';
      setPending(null);
      pushNote('error', reason ?? `${who} didn't let you into room ${code} this time`);
    };
    const onState = (v: RoomView) => {
      sampleView(v);
      viewRef.current = v;
      setView(v);
      const key = `${v.code}:${socket.id ?? ''}`;
      if (key !== roomKeyRef.current) {
        roomKeyRef.current = key;
        setRoomKey(key);
      }
      // a room made from a game tile: the host switches it to that game once (servers that took it at create skip this)
      const want = wantGame.current;
      if (want && v.phase === 'lobby' && v.hostId === v.meId) {
        wantGame.current = null;
        if (v.config.game !== want) void request('room:config', { ...v.config, game: want }).catch(() => undefined);
      }
    };
    const onAnnounce = (n: Announcement) => {
      // forfeits and games stopped by an error always pop up
      pushNote(n.forfeit || n.error ? (n.error ? 'error' : 'info') : n.kind, n.text, !!(n.forfeit || n.error));
      // tables that speak quick lines (Ludo) have no announcer voice: moves are shown, not read out
      if (n.kind !== 'room' && !speaksQuickChat(viewRef.current?.config.game)) speak(n.text);
    };
    // chat is shown; at tables that speak quick lines (Ludo) a quick line is also said aloud, typed lines never are
    const onChat = (c: ChatEvent) => {
      const v = viewRef.current;
      // muted by me: nothing from them reaches me
      if (mutedMember(v, c.from)) return;
      const who =
        c.from === v?.meId ? 'You' : ([...(v?.players ?? []), ...(v?.watchers ?? [])].find((p) => p.id === c.from)?.name ?? 'Someone');
      const set = chatSetOf(v?.config.game);
      const text = set.messages[c.index] ?? '';
      // dropped on the last play: it pops onto the pile instead of floating up
      if (c.kind === 'reaction' && c.on === 'pile') {
        pushPileReaction(set.reactions[c.index] ?? '❓', who);
        return;
      }
      if (c.kind === 'reaction') {
        setReactions((prev) => [...prev.slice(-12), { key: ++noteSeq, emoji: set.reactions[c.index] ?? '❓', who, at: Date.now() }]);
        return;
      }
      // each player in their own pitch, so you can tell who said it
      if (speaksQuickChat(v?.config.game)) {
        // each game's spoken lines carry their Hindi words and a mood; lines without one are read as written
        const line = set.voice?.[c.index];
        if (line) speakLine(line, text, voiceShiftOf(c.from));
        else speak(text, false, voiceShiftOf(c.from));
      }
      // one place only: at the table, another player's message is a bubble on their seat; my own, a watcher's and the lobby's float up
      const onSeat = !!v && v.phase !== 'lobby' && c.from !== v.meId && v.players.some((p) => p.id === c.from);
      if (onSeat) setBubbles((prev) => [...prev.slice(-10), { key: ++noteSeq, from: c.from, text, at: Date.now() }]);
      else setReactions((prev) => [...prev.slice(-12), { key: ++noteSeq, emoji: '', text, who, at: Date.now() }]);
    };
    const onThrow = (t: ThrowEvent) => {
      if (mutedMember(viewRef.current, t.from)) return;
      setFlyers((prev) => [...prev.slice(-8), { key: ++noteSeq, from: t.from, to: t.to, emoji: THROWS[t.index] ?? '❓', count: 1 }]);
    };
    const onGift = (g: GiftEvent) => {
      setFlyers((prev) => [...prev.slice(-8), { key: ++noteSeq, from: g.from, to: g.to, emoji: '🪙', count: 5, label: `+🪙 ${g.amount}` }]);
    };
    const onGiftReceived = (g: GiftReceived) => pushNote('info', `🎁 ${g.fromName} sent you 🪙 ${g.amount}`);
    // the server is shutting down for a deploy or restart; it comes back and the rejoin follows
    const onRestarting = (r?: ServerRestarting) => {
      restartSeen.current = true;
      resetServerClock();
      if (typeof r?.at === 'number') sampleServerTime(r.at);
      pushNote('info', SERVER_RESTART_TEXT.en);
    };
    const onReplaced = () => {
      replacedRef.current = true;
      setReplaced(true);
    };
    // host's get-ready buzz: shake the phone (Android; iPhones can't), an attention sound and a banner
    const onNudged = ({ from }: { from: string }) => {
      navigator.vibrate?.([200, 100, 200, 100, 300]);
      sfx.nudge();
      setNudged({ from, key: ++noteSeq });
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
    socket.on('server:restarting', onRestarting);
    socket.on('room:kicked', onKicked);
    socket.on('room:nudged', onNudged);
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
      socket.off('room:nudged', onNudged);
      socket.off('gift:received', onGiftReceived);
      socket.off('room:kicked', onKicked);
      socket.off('invite', onInvite);
      socket.off('watch:admitted', onAdmitted);
      socket.off('watch:denied', onDenied);
      socket.off('session:replaced', onReplaced);
      socket.off('server:restarting', onRestarting);
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
      /** game: the game picked on Home (newer servers start the room in it; otherwise it is switched on the first view) */
      create: (name: string, game?: GameKind) =>
        run(async () => {
          wantGame.current = game ?? null;
          enter(await request<Entered>('room:create', { name, ...(game && { game }) }), name);
        }),
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
      /** the error screen's Back to Home: leave if the server answers, and go home either way */
      leaveAnyway: async () => {
        await request('room:leave').catch(() => undefined);
        session.current = null;
        clearSession();
        viewRef.current = null;
        setView(null);
      },
      kick: (memberId: string) => run(() => request('room:kick', { memberId })),
      /** host: a bot takes a free seat */
      addBot: () => run(() => request('room:addBot')),
      /** asks a friend to let me into their room (to play or watch); I get in when they say yes */
      joinFriend: async (userId: string, watch: boolean, name: string) =>
        (await run(async () => {
          const res = await request<JoinReply>('friend:join', { userId, watch });
          // the server gave up my old seat to take this one
          if (viewRef.current && viewRef.current.code !== res.code) {
            session.current = null;
            clearSession();
            viewRef.current = null;
            setView(null);
          }
          if (res.pending) setPending({ code: res.code, name, askedOf: res.askedOf });
          else enter({ code: res.code, token: res.token! }, name);
        })) !== null,
      /** the server's answer (pushed: the friend was offline and got a phone notification), or null if it failed */
      invite: (userId: string) => run(() => request<InviteAck>('friend:invite', { userId })),
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
      /** lobby: ready to start, or not yet (the host starts once everyone is ready) */
      setReady: (ready: boolean) => run(() => request('room:ready', { ready })),
      /** host: buzz everyone not ready yet (server allows one every NUDGE_COOLDOWN_MS); errors come back to the Buzz button */
      nudge: async (): Promise<{ ok: true; count: number } | { ok: false; error: string }> => {
        try {
          const res = await request<{ count: number }>('room:nudge');
          return { ok: true, count: res.count };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Could not buzz' };
        }
      },
      /** the get-ready banner was seen or answered */
      clearNudge: () => setNudged(null),
      toLobby: () => run(() => request('room:lobby')),
      rematch: () => run(() => request('room:rematch')),
      endGame: () => run(() => request('room:end')),
      /** game over: everything one player put down and still held, for the lie reveal; errors are shown where it was asked */
      playsOf: (playerId: string) => request<PlayerPlays>('room:plays', { playerId }),
      /** game over with Saza on: the winner swaps the loser's badge */
      pickSaza: (badge: SazaBadge) => run(() => request('room:saza', { badge })),
      makeHost: (memberId: string) => run(() => request('room:host', { memberId })),
      // memberId: the host moving someone else; omitted for yourself
      setWatching: (watching: boolean, memberId?: string) => run(() => request('room:watch', { watching, memberId })),
      /** shield: 🔒 Card Shield, nobody can call or peek at this play */
      play: async (cardIds: string[], rank?: Rank, shield = false) =>
        (await run(() => request('game:play', { cardIds, rank, ...(shield && { shield: true }) }))) !== null,
      pass: () => run(() => request('game:pass')),
      bluff: (playId: string, cardIndex?: number, bet = 0) => run(() => request('game:bluff', { playId, cardIndex, bet })),
      /** the card comes back only to me; null if the peek was refused */
      peek: async (playId: string, cardIndex: number) =>
        (await run(() => request<{ card: Card }>('game:peek', { playId, cardIndex })))?.card ?? null,
      /** Crazy 7: put one card on the pile */
      /** suit: the suit named with a J (power cards) */
      c7Play: async (cardId: string, suit?: Suit) => (await run(() => request('c7:play', { cardId, ...(suit && { suit }) }))) !== null,
      /** Rang: color names the colour for a wild; targetId picks who to swap hands with for a 7 (7-0 on) */
      /** extraIds: doubles, the other cards of the same number put down with it (the last one ends on top) */
      rangPlay: async (cardId: string, color?: RangColor, targetId?: string, extraIds?: string[]) =>
        (await run(() => request('rang:play', { cardId, ...(color && { color }), ...(targetId && { targetId }), ...(extraIds?.length && { extraIds }) }))) !== null,
      rangPick: () => run(() => request('rang:pick')),
      rangPass: () => run(() => request('rang:pass')),
      rangCall: () => run(() => request('rang:call')),
      rangChallenge: () => run(() => request('rang:challenge')),
      /** Crazy 7: pick a card, or take the 7 penalty when one waits */
      c7Pick: () => run(() => request('c7:pick')),
      c7Pass: () => run(() => request('c7:pass')),
      /** Crazy 7: say "last card" */
      c7Call: () => run(() => request('c7:call')),
      /** registry games (Ludo, ...): one move for the game on the table */
      gameMove: async (move: PluggedMove) => (await run(() => request('game:move', move))) !== null,
      /** a real-time game's move (a slice, a step): routine refusals (late, too quick) stay quiet */
      gameMoveQuiet: (move: PluggedMove) => request('game:move', move).then(() => true, () => false),
      /** my Ludo looks for the room (gotis and dice everyone sees, the board when I'm host); quiet on older servers */
      ludoLook: (look: LudoLookChoice) => request('ludo:look', look).catch(() => undefined),
      shuffleTeams: () => run(() => request('room:teams')),
      moveToSlot: (slot: number) => run(() => request('room:slot', { slot })),
      askSwap: (memberId: string) => run(() => request('room:swap', { memberId })),
      answerSwap: (memberId: string, accept: boolean) => run(() => request('room:swapAnswer', { memberId, accept })),
      chat: (kind: ChatKind, index: number) => run(() => request('chat:send', { kind, index })),
      /** an emoji dropped on the last play (hold the pile) */
      reactOnPile: (index: number) => run(() => request('chat:send', { kind: 'reaction', index, on: 'pile' })),
      /** throw an emoji at someone in the room; everyone sees it fly */
      throwAt: (memberId: string, index: number) => run(() => request('chat:throw', { to: memberId, index })),
      /** a recorded voice note for everyone else in the room; errors come back to the mic button */
      dropFlyer: (key: number) => setFlyers((prev) => prev.filter((f) => f.key !== key)),
      reclaim: () => {
        replacedRef.current = false;
        setReplaced(false);
        socket.connect();
      },
      toast: (text: string) => pushNote('info', text),
      /** the "game couldn't be recovered" card was closed */
      clearLostGame: () => setLostGame(false),
    };
  }, [run, pushNote]);

  return { status, connectionId, roomKey, view, notes, reactions, bubbles, flyers, invites, replaced, pendingWatch, nudged, rejoining, lostGame, actions };
}

export type Actions = ReturnType<typeof useBluff>['actions'];

/** friend:invite's answer */
export interface InviteAck {
  /** the friend was offline: a notification went to their phone */
  pushed?: boolean;
}
