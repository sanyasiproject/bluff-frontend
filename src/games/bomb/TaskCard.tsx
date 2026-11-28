// The bomb holder's quick task: a big prompt and 2-4 big answer buttons (the arrow task also takes a swipe); others see it read-only
import { useRef, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { BOMB_ARROWS, BOMB_INK_HEX, type BombTask } from '../../types';

const ARROW: Record<string, string> = { up: '⬆', down: '⬇', left: '⬅', right: '➡' };
const TITLE: Record<string, string> = { sum: 'Quick sum!', bigger: 'Tap the bigger number', colour: 'Tap the INK colour', odd: 'Tap the odd one out', count: 'How many dots?', arrow: 'Swipe the arrow’s way' };

interface Props {
  task: BombTask;
  /** I hold the bomb and may answer */
  mine: boolean;
  wrong: boolean;
  disabled: boolean;
  /** the holder's name, on a watcher's copy */
  who?: string;
  onAnswer: (choice: number) => void;
}

export function TaskCard({ task, mine, wrong, disabled, who, onAnswer }: Props) {
  const start = useRef<[number, number] | null>(null);
  const swipeDown = (e: RPointerEvent) => {
    if (mine && task.kind === 'arrow') start.current = [e.clientX, e.clientY];
  };
  const swipeUp = (e: RPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || disabled) return;
    const dx = e.clientX - s[0];
    const dy = e.clientY - s[1];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const i = task.choices.findIndex((c, k) => c === dir || BOMB_ARROWS[k] === dir);
    if (i >= 0) onAnswer(i);
  };

  let prompt = <b className="bp-q">{task.prompt}</b>;
  if (task.kind === 'colour') {
    prompt = (
      <b className="bp-q bp-word" style={{ color: task.ink ? BOMB_INK_HEX[task.ink] : undefined } as CSSProperties}>
        {task.word ?? task.prompt}
      </b>
    );
  }
  if (task.kind === 'count') {
    prompt = (
      <span className="bp-dots" aria-label="Count the dots">
        {(task.dots ?? []).map(([x, y], i) => (
          <i key={i} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
        ))}
      </span>
    );
  }
  if (task.kind === 'arrow') prompt = <b className="bp-q bp-arrow">{ARROW[task.arrow ?? ''] ?? task.prompt}</b>;
  if (task.kind === 'odd') prompt = <b className="bp-q bp-arrow">🧐</b>;
  if (task.kind === 'bigger') prompt = <b className="bp-q bp-arrow">⚖️</b>;

  return (
    <div key={task.id} className={cx('bp-card', `k-${task.kind}`, wrong && 'wrong', !mine && 'theirs')} onPointerDown={swipeDown} onPointerUp={swipeUp}>
      <small className="bp-title">{mine ? (task.kind === 'sum' ? TITLE.sum : task.prompt || TITLE[task.kind]) : `${who ?? 'They'} must solve`}</small>
      <div className="bp-prompt">{prompt}</div>
      <div className={cx('bp-choices', `n${task.choices.length}`)}>
        {task.choices.map((c, i) => (
          <button key={`${task.id}-${i}`} className={cx('bp-choice', task.kind === 'odd' && 'emoji')} disabled={!mine || disabled} onClick={() => onAnswer(i)}>
            {task.kind === 'arrow' ? (ARROW[c] ?? ARROW[BOMB_ARROWS[i]] ?? c) : task.kind === 'colour' ? c[0].toUpperCase() + c.slice(1) : c}
          </button>
        ))}
      </div>
    </div>
  );
}
