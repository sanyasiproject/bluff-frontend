// Chess game end: the result and why, each side's rating change ("800 → 814, +14"), then Analyse, Rematch or Continue
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Avatar } from "../../components/Avatar";
import { Backdrop } from "../../components/Overlays";
import { cx } from "../../lib/cards";
import { confetti, reducedMotion } from "../../lib/motion";
import type { RoomView } from "../../types";
import type { ChessView, Color } from "./lib";
import { reasonText, resultTitle, sideName } from "./texts";

const ChessAnalysis = lazy(() =>
  import("./ChessAnalysis").then((m) => ({ default: m.ChessAnalysis })),
);

interface Props {
  view: RoomView;
  cv: ChessView;
  myColor: Color | null;
  onNext: () => void;
  onRematch?: () => void;
}

export function ChessOver({ view, cv, myColor, onNext, onRematch }: Props) {
  const [analyse, setAnalyse] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const people = [
    ...view.players,
    ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false })),
  ];
  const who = (c: Color) => people.find((p) => p.id === cv.players[c]);
  const nameOf = (c: Color) =>
    cv.players[c] === view.meId ? "You" : (who(c)?.name ?? sideName(c));
  const won = !!myColor && cv.result?.winner === myColor;
  const title = !cv.result
    ? "Game over"
    : cv.result.reason === "abort"
      ? "Game aborted"
      : !myColor
        ? resultTitle(cv.result)
        : !cv.result.winner
          ? "🤝 Draw"
          : won
            ? "🏆 You won!"
            : "You lost";

  useEffect(() => {
    if (!won || reducedMotion()) return;
    const r = box.current?.getBoundingClientRect();
    if (r)
      confetti(r.left + r.width / 2, r.top + r.height * 0.2, {
        count: 60,
        spread: 1.4,
      });
  }, []);

  const row = (c: Color) => {
    const p = who(c);
    const r = cv.ratings?.[c];
    const d = cv.ratingDiff?.[c];
    const before = r ? Math.round(r.r) : null;
    return (
      <li className={cx("ch-over-row", cv.result?.winner === c && "won")}>
        <Avatar
          name={p?.name ?? "?"}
          avatar={p?.avatar ?? null}
          bot={p?.bot}
          size="sm"
        />
        <span className="ch-over-who">
          <b data-no-translate>{nameOf(c)}</b>
          <small>{sideName(c)}</small>
        </span>
        {before !== null && d !== undefined ? (
          <span className="ch-over-rating">
            {before} → {before + d}
            <em className={cx("ch-diff", d > 0 ? "up" : d < 0 ? "down" : "")}>
              {d > 0 ? `+${d}` : d}
            </em>
          </span>
        ) : (
          <span className="ch-over-rating muted">
            {r
              ? `${before}${r.prov ? "?" : ""}`
              : cv.bots?.[c]
                ? `🤖 Level ${cv.bots[c]}`
                : cv.rated
                  ? "Saving…"
                  : "Casual"}
          </span>
        )}
      </li>
    );
  };

  return (
    <>
      {!analyse && (
        <Backdrop center onClose={onNext} panel="lu-over pt-over ch-over">
          <div ref={box} className="lu-over-box">
            <h2 className="lu-over-title">{title}</h2>
            {cv.result && (
              <p className="ch-over-why">
                {cv.result.reason === "abort"
                  ? "Nobody wins"
                  : `${resultTitle(cv.result)} · ${reasonText(cv.result.reason)}`}
              </p>
            )}
            <ol className="ch-over-rows">
              {row("w")}
              {row("b")}
            </ol>
            <div className="ch-over-btns">
              {cv.moves.length > 1 && (
                <button className="btn" onClick={() => setAnalyse(true)}>
                  🔍 Analyse
                </button>
              )}
              {onRematch && (
                <button className="btn" onClick={onRematch}>
                  🔁 Rematch
                </button>
              )}
              <button className="btn primary shine" onClick={onNext}>
                Continue
              </button>
            </div>
            {onRematch && <p className="muted small">Rematch: colours swap</p>}
          </div>
        </Backdrop>
      )}
      {analyse && (
        <Suspense fallback={null}>
          <ChessAnalysis
            gameId={
              cv.gameId ??
              `${view.code}:${cv.initialFen}:${cv.moves.length}:${cv.moves.slice(-4).join("")}`
            }
            variant={cv.variant}
            initialFen={cv.initialFen}
            moves={cv.moves}
            names={{ w: nameOf("w"), b: nameOf("b") }}
            result={cv.result}
            bottom={myColor ?? "w"}
            onClose={() => setAnalyse(false)}
          />
        </Suspense>
      )}
    </>
  );
}
