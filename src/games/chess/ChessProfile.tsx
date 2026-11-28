// Profile → Chess: a rating card per perf ("?" while provisional), the picked perf's record and graph, recent games and the leaderboard
import '../../styles/land-chess-profile.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { errorText } from '../../lib/api';
import { cx } from '../../lib/cards';
import type { Auth } from '../../useAuth';
import { chessApi } from './api';
import { CHESS_PERFS, CHESS_START_RATING, chessRatingText, type ChessGameRecord, type ChessGameSummary, type ChessLeaderboard, type ChessPerf, type ChessRating } from './lib';
import { RatingGraph } from './RatingGraph';
import { reasonText, timeText } from './texts';

const ChessAnalysis = lazy(() => import('./ChessAnalysis').then((m) => ({ default: m.ChessAnalysis })));

const fresh = (): ChessRating => ({ r: CHESS_START_RATING, rd: 500, vol: 0.09, games: 0, w: 0, l: 0, d: 0, peak: CHESS_START_RATING, streak: 0, bestStreak: 0, history: [], updatedAt: 0 });

export function ChessProfile({ auth }: { auth: Auth }) {
  const token = auth.token;
  const me = auth.user?.id ?? null;
  const [perfs, setPerfs] = useState<Partial<Record<ChessPerf, ChessRating>> | null>(null);
  const [perf, setPerf] = useState<ChessPerf>('blitz');
  const [pane, setPane] = useState<'games' | 'board'>('games');
  const [games, setGames] = useState<ChessGameSummary[] | null>(null);
  const [board, setBoard] = useState<ChessLeaderboard | null>(null);
  const [open, setOpen] = useState<ChessGameRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    chessApi
      .ratings(token)
      .then((r) => {
        setPerfs(r.perfs);
        // start on the perf played most
        const most = CHESS_PERFS.map((p) => p.id).sort((a, b) => (r.perfs[b]?.games ?? 0) - (r.perfs[a]?.games ?? 0))[0];
        if (most && r.perfs[most]?.games) setPerf(most);
      })
      .catch((e) => setErr(errorText(e)));
    chessApi.games(token).then((r) => setGames(r.games), () => setGames([]));
  }, [token]);
  useEffect(() => {
    if (!token || pane !== 'board') return;
    setBoard(null);
    chessApi.leaderboard(token, perf).then(setBoard, (e) => setErr(errorText(e)));
  }, [token, perf, pane]);

  if (!token) return <p className="muted ch-prof-note">Log in to keep chess ratings, your games and a place on the leaderboard.</p>;
  const rating = perfs?.[perf] ?? fresh();
  const name = CHESS_PERFS.find((p) => p.id === perf)?.name ?? perf;
  const openGame = (id: string) => chessApi.game(token, id).then((r) => setOpen(r.game), (e) => setErr(errorText(e)));

  return (
    <div className="ch-prof">
      <div className="ch-prof-col">
        <div className="ch-perfs" role="radiogroup" aria-label="Rating types">
          {CHESS_PERFS.map((p) => {
            const r = perfs?.[p.id];
            return (
              <button key={p.id} type="button" role="radio" aria-checked={p.id === perf} className={cx('ch-perf', p.id === perf && 'on', !r?.games && 'unplayed')} onClick={() => setPerf(p.id)}>
                <span aria-hidden>{p.icon}</span>
                <small>{p.name}</small>
                <b>{chessRatingText(r ?? fresh())}</b>
              </button>
            );
          })}
        </div>
        <section className="panel ch-perf-card">
          <h3 className="section-title">
            {CHESS_PERFS.find((p) => p.id === perf)?.icon} {name}
            <b className="ch-perf-now">{chessRatingText(rating)}</b>
          </h3>
          <div className="ch-perf-stats">
            <span><b>{Math.round(rating.peak)}</b><small>peak</small></span>
            <span><b>{rating.games}</b><small>games</small></span>
            <span><b className="ch-w">{rating.w}</b><small>won</small></span>
            <span><b className="ch-l">{rating.l}</b><small>lost</small></span>
            <span><b>{rating.d}</b><small>drawn</small></span>
            <span><b>{rating.streak}</b><small>streak</small></span>
            <span><b>{rating.bestStreak}</b><small>best streak</small></span>
          </div>
          <RatingGraph history={rating.history} />
          {rating.rd > 110 && <p className="muted small">"?" means the rating is still settling: a few more rated games fix it.</p>}
        </section>
      </div>
      <div className="ch-prof-col">
        <div className="mini-seg ch-prof-tabs" role="tablist">
          <button role="tab" aria-selected={pane === 'games'} className={cx(pane === 'games' && 'on')} onClick={() => setPane('games')}>
            🕘 Recent games
          </button>
          <button role="tab" aria-selected={pane === 'board'} className={cx(pane === 'board' && 'on')} onClick={() => setPane('board')}>
            {`🏆 ${name} top 50`}
          </button>
        </div>
        {err && <p className="muted small">{err}</p>}
        {pane === 'games' && <RecentGames games={games} me={me} onOpen={(id) => void openGame(id)} />}
        {pane === 'board' && <Leaderboard board={board} me={me} />}
      </div>
      {open && (
        <Suspense fallback={null}>
          <ChessAnalysis
            gameId={open.id}
            variant={open.variant}
            initialFen={open.initialFen}
            moves={open.moves}
            names={{ w: open.players.w.name, b: open.players.b.name }}
            result={open.result}
            bottom={open.players.b.userId === me ? 'b' : 'w'}
            onClose={() => setOpen(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function RecentGames({ games, me, onOpen }: { games: ChessGameSummary[] | null; me: string | null; onOpen: (id: string) => void }) {
  if (!games) return <p className="muted small">Loading…</p>;
  if (!games.length) return <p className="muted small ch-prof-note">No chess games yet. Finished games show here; tap one to analyse it.</p>;
  return (
    <ul className="ch-games">
      {games.map((g) => {
        const side = g.players.b.userId === me ? 'b' : 'w';
        const them = g.players[side === 'w' ? 'b' : 'w'];
        const mine = g.players[side];
        const res = g.result.reason === 'abort' ? 'abort' : !g.result.winner ? 'draw' : g.result.winner === side ? 'win' : 'loss';
        const diff = mine.after !== null && mine.before !== null ? mine.after - mine.before : null;
        return (
          <li key={g.id}>
            <button type="button" className={cx('ch-game', `res-${res}`)} onClick={() => onOpen(g.id)}>
              <i className="ch-game-res">{res === 'win' ? 'W' : res === 'loss' ? 'L' : res === 'draw' ? '½' : '–'}</i>
              <span className="ch-game-who">
                <b data-no-translate>{them.bot ? `🤖 Level ${them.bot}` : them.name}</b>
                <small>
                  {CHESS_PERFS.find((p) => p.id === g.perf)?.icon} {timeText(g.time)} · {side === 'w' ? 'White' : 'Black'} · {reasonText(g.result.reason)}
                </small>
              </span>
              {g.rated && diff !== null ? <em className={cx('ch-diff', diff > 0 ? 'up' : diff < 0 ? 'down' : '')}>{diff > 0 ? `+${diff}` : diff}</em> : <small className="muted">{g.rated ? 'Rated' : 'Casual'}</small>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Leaderboard({ board, me }: { board: ChessLeaderboard | null; me: string | null }) {
  if (!board) return <p className="muted small">Loading…</p>;
  return (
    <div className="ch-lb">
      {board.me && (
        <p className="ch-lb-me">
          {board.me.rank ? `You are #${board.me.rank}` : board.me.rating?.games ? 'Your rating is still settling ("?"): play a few more rated games to be ranked' : 'Play a rated game to be ranked'}
        </p>
      )}
      {!board.top.length && <p className="muted small">Nobody is ranked here yet.</p>}
      <ol>
        {board.top.map((r) => (
          <li key={r.userId} className={cx(r.userId === me && 'mine')}>
            <i>{r.rank}</i>
            <Avatar name={r.displayName} avatar={r.avatar} size="sm" />
            <b data-no-translate>{r.displayName}</b>
            <span>{Math.round(r.r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
