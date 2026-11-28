// Aiming on the target sea: a plain shot, or a power (radar 3 × 3, salvo of 3 cells, torpedo row); the power buttons
import { useState } from 'react';
import { cx } from '../../lib/cards';
import { SEA_SIZE, type SeaMoveInput, type SeaPower } from '../../types';

export type AimMode = 'fire' | SeaPower;
const POWER = { radar: { icon: '📡', name: 'Radar', hint: 'Tap a cell: see the ships in the 3 × 3 round it' }, salvo: { icon: '💥', name: 'Salvo', hint: 'Tap 3 cells, then they all fire' }, torpedo: { icon: '🚀', name: 'Torpedo', hint: 'Tap a row: it runs from the left to the first ship' } } as const;

export function useAim() {
  const [mode, setMode] = useState<AimMode>('fire');
  const [salvo, setSalvo] = useState<[number, number][]>([]);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const reset = () => {
    setMode('fire');
    setSalvo([]);
  };
  /** a tap on a cell: the move to send now, or null while a salvo is still being picked */
  const tap = (target: string, x: number, y: number, shots: number[]): SeaMoveInput | null => {
    if (mode === 'radar') return { type: 'radar', target, x, y };
    if (mode === 'torpedo') return { type: 'torpedo', target, row: y };
    if (shots[y * SEA_SIZE + x]) return null;
    if (mode === 'salvo') {
      const has = salvo.some(([a, b]) => a === x && b === y);
      const next = has ? salvo.filter(([a, b]) => a !== x || b !== y) : [...salvo, [x, y] as [number, number]];
      if (next.length < 3) {
        setSalvo(next);
        return null;
      }
      setSalvo([]);
      return { type: 'salvo', target, cells: next };
    }
    return { type: 'fire', target, x, y };
  };
  return { mode, setMode, salvo, setSalvo, hover, setHover, reset, tap };
}

export type AimState = ReturnType<typeof useAim>;

/** what the aim shows on the sea under the finger */
export function AimOverlay({ aim }: { aim: AimState }) {
  const h = aim.hover;
  return (
    <g className="sb-aim" aria-hidden>
      {aim.salvo.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x + 0.5} ${y + 0.5})`} className="sb-mark">
          <circle r="0.36" />
          <path d="M-0.2 0H0.2M0 -0.2V0.2" />
        </g>
      ))}
      {h && aim.mode === 'radar' && <rect x={Math.max(0, h[0] - 1)} y={Math.max(0, h[1] - 1)} width={Math.min(SEA_SIZE, h[0] + 2) - Math.max(0, h[0] - 1)} height={Math.min(SEA_SIZE, h[1] + 2) - Math.max(0, h[1] - 1)} rx="0.15" className="sb-aim-radar" />}
      {h && aim.mode === 'torpedo' && (
        <g className="sb-aim-row">
          <rect x="0" y={h[1]} width={SEA_SIZE} height="1" />
          <path d={`M-0.65 ${h[1] + 0.5}h0.5l-0.18 -0.18M-0.15 ${h[1] + 0.5}l-0.18 0.18`} />
        </g>
      )}
      {h && (aim.mode === 'fire' || aim.mode === 'salvo') && (
        <g transform={`translate(${h[0] + 0.5} ${h[1] + 0.5})`} className="sb-cross">
          <circle r="0.38" />
          <path d="M-0.55 0H-0.2M0.2 0H0.55M0 -0.55V-0.2M0 0.2V0.55" />
        </g>
      )}
    </g>
  );
}

/** my powers: tap one to aim with it, tap again to go back to a plain shot */
export function PowerBar({ held, aim, live }: { held: SeaPower[]; aim: AimState; live: boolean }) {
  if (!held.length) return null;
  return (
    <div className="sb-powers" role="group" aria-label="Powers">
      {held.map((p, i) => (
        <button
          key={`${p}-${i}`}
          className={cx('sb-power', aim.mode === p && 'on')}
          disabled={!live}
          onClick={() => {
            aim.setSalvo([]);
            aim.setMode(aim.mode === p ? 'fire' : p);
          }}
          title={POWER[p].hint}
        >
          <i>{POWER[p].icon}</i>
          {POWER[p].name}
        </button>
      ))}
      {aim.mode !== 'fire' && <small className="sb-power-hint">{POWER[aim.mode].hint}</small>}
    </div>
  );
}
