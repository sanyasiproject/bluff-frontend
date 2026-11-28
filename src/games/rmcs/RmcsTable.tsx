// The Raja Mantri Chor Sipahi table: a festive wooden table with a rangoli, a big chit by each player's card on the rails, the Mantri's guess and the score
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-rmcs.css';
import '../../styles/land-rmcs-fx.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-rmcs-wide.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LevelUp } from '../../components/LevelUp';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { GameOver } from '../../components/Overlays';
import { QuickChat } from '../../components/QuickChat';
import { SeatSheet } from '../../components/Table';
import { useTableFx } from '../../components/TableFx';
import { TableInfo } from '../../components/TableInfo';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { RMCS_EMOJI, RMCS_NAMES, type RmcsRole, type RmcsView } from '../../types';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import type { TableProps } from '../registry';
import { Chit } from './Chit';
import { chorRuns, cuffs, flyPoints } from './fx';
import { RmcsOver } from './RmcsOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { rmcsSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';
import { serverNow } from '../../lib/serverClock';

const BUBBLE_MS = 4000;
/** me at the near side, then round the table */
const SPOTS = ['b', 'l', 't', 'r'];
/** each spot's rail corner, and its colour */
const CORNER: Record<string, string> = { b: 'bl', l: 'tl', t: 'tr', r: 'br' };
const SPOT_COL: Record<string, string> = { b: '#ffb300', l: '#26c6b4', t: '#b55bff', r: '#ff5f5f' };

export function RmcsTable(props: TableProps) {
  const rv = props.view.plugged?.kind === 'rmcs' ? props.view.plugged.rmcs : null;
  if (!rv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Dealing the chits…</p>
      </main>
    );
  }
  return <RmcsTableInner {...props} rv={rv} />;
}

/** seconds left until a time, ticking */
function useSecondsLeft(endsAt: number | null): number | null {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!endsAt) return;
    setNow(serverNow());
    const t = window.setInterval(() => setNow(serverNow()), 250);
    return () => window.clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

interface Announce {
  key: number;
  text: string;
  sub?: string;
  tone: 'gold' | 'red' | 'blue' | 'plain';
  /** big in the middle of the table (results), else a strip at the top */
  mid?: boolean;
}

function RmcsTableInner({ view, actions, bubbles, auth, notes = [], rv }: TableProps & { rv: RmcsView }) {
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [announce, setAnnounce] = useState<Announce | null>(null);
  const [siren, setSiren] = useState(0);
  const [busy, setBusy] = useState(false);
  const chitEls = useRef(new Map<string, HTMLElement | null>());
  const scoreEls = useRef(new Map<string, HTMLElement | null>());
  const tableRef = useRef<HTMLDivElement>(null);
  const startLevel = useRef<number | null>(null);
  useBack(() => setPanel('menu'));
  const { fx, layer: fxLayer } = useTableFx();

  const me = view.players.find((p) => p.id === view.meId);
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const people = [...view.players, ...view.leftPlayers];
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : (people.find((p) => p.id === id)?.name ?? 'Someone'));
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;

  // the four at the table in seat order, turned so I sit at the near side
  const known = Object.keys(rv.scores);
  const all = known.length ? known : view.players.map((p) => p.id);
  const at = Math.max(0, all.indexOf(view.meId));
  const ids = [...all.slice(at), ...all.slice(0, at)];
  const spotOf = (id: string) => SPOTS[ids.indexOf(id)] ?? 'b';

  const roleOf = (id: string): RmcsRole | null => rv.shown[id] ?? (id === view.meId && rv.opened.includes(id) ? rv.myRole : null) ?? null;
  const roleHolder = (r: RmcsRole) => ids.find((id) => rv.shown[id] === r) ?? (rv.myRole === r ? view.meId : null);
  const raja = roleHolder('raja');
  const mantri = rv.phase !== 'open' ? roleHolder('mantri') : null;
  const iAmMantri = rv.phase === 'guess' && rv.myRole === 'mantri' && !!me;
  const suspects = rv.phase === 'guess' ? ids.filter((id) => id !== mantri && rv.shown[id] !== 'raja') : [];
  const lastRound = rv.phase === 'result' ? rv.history[rv.history.length - 1] : null;
  const left = useSecondsLeft(playing && rv.phase !== 'result' ? rv.endsAt : null);
  const myClosed = !!me && rv.phase === 'open' && !rv.opened.includes(view.meId);

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setOverSeen(false);
  }, [playing]);
  const myLevel = me?.level ?? null;
  useEffect(() => {
    if (view.phase === 'over' && myLevel !== null && startLevel.current !== null && myLevel > startLevel.current) setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  const sayTimer = useRef(0);
  const say = (a: Omit<Announce, 'key'>, delay = 0, ms = 2000) => {
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => {
      setAnnounce({ ...a, key: Date.now() });
      sayTimer.current = window.setTimeout(() => setAnnounce(null), ms);
    }, delay);
  };
  useEffect(() => () => window.clearTimeout(sayTimer.current), []);

  // a new round: the chits fly out from the middle of the table to each player
  const dealt = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!playing || rv.phase !== 'open' || dealt.current === rv.round) return;
    const first = dealt.current === null && rv.opened.length > 0;
    dealt.current = rv.round;
    if (first) return;
    say({ text: `Round ${rv.round} of ${rv.rounds}`, sub: 'Open your chit!', tone: 'plain' }, 0, 1500);
    rmcsSfx.deal();
    if (reducedMotion()) return;
    const c = tableRef.current?.getBoundingClientRect();
    if (!c) return;
    ids.forEach((id, i) => {
      const el = chitEls.current.get(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = c.left + c.width / 2 - (r.left + r.width / 2);
      const dy = c.top + c.height / 2 - (r.top + r.height / 2);
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) rotate(${(i - 1.5) * 40}deg) scale(0.5)`, opacity: 0 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${(i - 1.5) * 40}deg) scale(0.6)`, opacity: 1, offset: 0.15 },
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        ],
        { duration: 650, delay: i * 120, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1.1)', fill: 'backwards' },
      );
    });
  }, [rv.round, rv.phase, playing]);

  // the Raja shows himself: his chit flips open for all with a crown burst
  const rajaSeen = useRef<string | null>(raja && rv.shown[raja] ? `${rv.round}` : null);
  useEffect(() => {
    if (!raja || !rv.shown[raja] || rajaSeen.current === `${rv.round}` || rv.phase === 'result') return;
    rajaSeen.current = `${rv.round}`;
    rmcsSfx.raja();
    const el = chitEls.current.get(raja);
    tm.later(() => {
      fx('call', el, { text: '👑 RAJA!', color: '#ffd54a' });
      confettiAt(el, { count: 24, spread: 0.6 });
    }, 250);
    say({ text: `Raja is ${raja === view.meId ? 'You' : name(raja)} 👑`, tone: 'gold' }, 200);
  }, [raja, rv.shown[raja ?? ''], rv.round]);

  // guessing starts: the Mantri in the spotlight
  const guessSeen = useRef<number | null>(rv.phase === 'guess' ? rv.round : null);
  useEffect(() => {
    if (rv.phase !== 'guess' || guessSeen.current === rv.round || !mantri) return;
    guessSeen.current = rv.round;
    if (mantri === view.meId) {
      sfx.turn();
      navigator.vibrate?.(40);
    }
    say({ text: mantri === view.meId ? 'You are the Mantri!' : `Mantri ${name(mantri)}, find the Chor!`, sub: mantri === view.meId ? 'Tap the chit of the Chor 🔍' : undefined, tone: 'blue' }, 300);
  }, [rv.phase, rv.round, mantri]);

  // the result: caught or got away, then the points fly to each score
  const resultSeen = useRef<number | null>(rv.phase === 'result' ? rv.round : null);
  useEffect(() => {
    if (rv.phase !== 'result' || resultSeen.current === rv.round || !lastRound) return;
    resultSeen.current = rv.round;
    const chor = ids.find((id) => lastRound.roles[id] === 'chor');
    const chorEl = chor ? chitEls.current.get(chor) : null;
    if (lastRound.correct) {
      rmcsSfx.siren();
      setSiren(Date.now());
      tm.later(() => setSiren(0), 2000);
      cuffs(chorEl);
      say({ text: 'Pakda gaya! 🦹', sub: `${chor === view.meId ? 'You were' : `${name(chor)} was`} the Chor`, tone: 'red', mid: true }, 150, 2600);
      navigator.vibrate?.([50, 40, 50]);
    } else {
      rmcsSfx.escape();
      chorRuns(chorEl);
      say({ text: 'Chor bach gaya! 😈', sub: lastRound.guess ? `${name(chor)} was the Chor` : 'Time ran out', tone: 'plain', mid: true }, 150, 2600);
      navigator.vibrate?.(80);
    }
    ids.forEach((id, i) => {
      const pts = lastRound.points[id] ?? 0;
      if (pts > 0) flyPoints(chitEls.current.get(id), scoreEls.current.get(id), `+${pts}`, 1100 + i * 150);
    });
    tm.later(() => rmcsSfx.points(), 2100);
  }, [rv.phase, rv.round]);

  const send = async (move: { type: 'open' } | { type: 'guess'; target: string }) => {
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'rmcs', move });
    setBusy(false);
  };
  const openMine = () => {
    if (!myClosed || busy) return;
    rmcsSfx.unfold();
    void send({ type: 'open' });
  };
  const guess = (id: string) => {
    if (!iAmMantri || busy) return;
    void send({ type: 'guess', target: id });
  };

  let status = '';
  if (playing) {
    if (rv.phase === 'open') status = myClosed ? `Tap your chit to open it${left !== null ? ` · ${left}s` : ''}` : `Everyone opens their chit…${left !== null ? ` ${left}s` : ''}`;
    else if (rv.phase === 'guess') status = iAmMantri ? `Who is the Chor? 🔍${left !== null ? ` · ${left}s` : ''}` : `Mantri ${name(mantri)} is looking for the Chor…${left !== null ? ` ${left}s` : ''}`;
    else if (lastRound) status = lastRound.correct ? 'Pakda gaya! 🦹' : 'Chor bach gaya! 😈';
  }
  const infoMine = (
    <p className="tinfo-counts">
      <span>{`🎲 Round ${rv.round} of ${rv.rounds}`}</span>
      {rv.myRole && <span>{`${RMCS_EMOJI[rv.myRole]} This round you are the ${RMCS_NAMES[rv.myRole]}`}</span>}
      {me && <span>{`⭐ Your score ${rv.scores[view.meId] ?? 0}`}</span>}
    </p>
  );
  const tips = ['Raja 1000 · Mantri 800 · Sipahi 500 · Chor 0', 'A wrong guess swaps the Mantri\'s and the Chor\'s points', 'The Raja shows himself; the Mantri must find the Chor'];
  const ranked = [...ids].sort((a, b) => (rv.scores[b] ?? 0) - (rv.scores[a] ?? 0));

  return (
    <main className={cx('table lu-table rm-table pr-wide rm-wide', iAmMantri && 'rm-guessing', rv.phase === 'guess' && 'rm-phase-guess')}>
      <div className="rm-room" aria-hidden />
      {siren > 0 && <div key={siren} className="rm-siren" aria-hidden />}
      <div ref={tableRef} className="rm-wood" aria-hidden>
        <span className="rm-rangoli" />
      </div>

      {/* the middle of the table: the round, and the Mantri's job in big letters */}
      <div className={cx('rm-plaque', iAmMantri && 'hot')} aria-hidden={!iAmMantri}>
        {rv.phase === 'guess' && mantri ? (
          iAmMantri ? (
            <>
              <b>🔍 Tap the Chor!</b>
              <small>One of these two</small>
            </>
          ) : (
            <>
              <b>🔍 Mantri {name(mantri)}</b>
              <small>is finding the Chor</small>
            </>
          )
        ) : (
          <>
            <small>Round</small>
            <b>
              {rv.round}/{rv.rounds}
            </b>
          </>
        )}
      </div>

      {ids.map((id) => {
        const role = roleOf(id);
        const live = (id === view.meId && myClosed) || (iAmMantri && suspects.includes(id));
        const mine = id === view.meId;
        const spot = spotOf(id);
        return (
          <div
            key={`c-${id}`}
            className={cx('rm-chit-spot', `at-${spot}`, mine && 'mine', iAmMantri && suspects.includes(id) && 'suspect', rv.phase === 'guess' && !suspects.includes(id) && 'dim')}
            style={{ ['--pc' as string]: SPOT_COL[spot] }}
          >
            <span className="rm-owner" data-no-translate>
              {mine ? 'You' : name(id)}
            </span>
            <Chit
              role={lastRound ? (lastRound.roles[id] ?? role) : role}
              open={!!(lastRound ? lastRound.roles[id] : role)}
              peeked={rv.opened.includes(id)}
              points={lastRound ? (lastRound.points[id] ?? 0) : null}
              live={live}
              big
              label={mine ? (myClosed ? 'Tap to open your chit' : 'Your chit') : iAmMantri && suspects.includes(id) ? `${name(id)}: is this the Chor?` : `${name(id)}'s chit`}
              onTap={mine && myClosed ? openMine : live ? () => guess(id) : undefined}
              chitRef={(el) => chitEls.current.set(id, el)}
            />
            {mine && myClosed && <span className="rm-hint">👆 Tap to open</span>}
            {iAmMantri && suspects.includes(id) && <span className="rm-hint chor">Chor? Tap!</span>}
          </div>
        );
      })}

      <Rails
        items={ids.map((id) => {
          const p = view.players.find((x) => x.id === id);
          const spot = spotOf(id);
          const shownRole = rv.shown[id] ?? null;
          const isMantri = id === mantri && rv.phase === 'guess';
          return {
            id,
            corner: CORNER[spot],
            node: (
              <RailSeat
                player={p}
                goneName={people.find((x) => x.id === id)?.name}
                color={SPOT_COL[spot]}
                turn={isMantri}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                onTap={p && p.id !== view.meId ? () => (iAmMantri && suspects.includes(id) ? guess(id) : setTarget(p.id)) : undefined}
                skin="rm-card"
                big={rv.scores[id] ?? 0}
                bigKey={rv.scores[id] ?? 0}
                label={ranked[0] === id && (rv.scores[id] ?? 0) > 0 ? '👑 lead' : 'pts'}
                numRef={(el) => scoreEls.current.set(id, el)}
                turnText="🔍 Mantri"
                myTurnText="🔍 Find the Chor!"
              >
                {shownRole && (
                  <span className={cx('rm-role-tag', `r-${shownRole}`)}>
                    {RMCS_EMOJI[shownRole]} {RMCS_NAMES[shownRole]}
                  </span>
                )}
              </RailSeat>
            ),
          };
        })}
      />

      {announce && (
        <div key={announce.key} className={cx('rm-announce', `tone-${announce.tone}`, announce.mid ? 'mid' : 'top')} role="status">
          <b>{announce.text}</b>
          {announce.sub && <small>{announce.sub}</small>}
        </div>
      )}

      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine} tips={tips} />
        {status && (
          <span key={status.replace(/\d+s$/, '')} className={cx('lu-status', (myClosed || iAmMantri) && 'mine')} role="status">
            {status}
          </span>
        )}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
      {!me && <p className="lu-watch-note">👀 Watching · chits show at each round's end</p>}

      {view.phase === 'over' && !overSeen && <RmcsOver view={view} rv={rv} ids={ids} onNext={() => setOverSeen(true)} />}
      {view.phase === 'over' && overSeen && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} leaveWhat="Your chits stop scoring" />
      {fxLayer}
    </main>
  );
}
