import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from '../lib/motion';
import { throwSfx } from '../lib/throwSounds';
import '../styles/throws.css';
import type { Flyer } from '../useBluff';
import { centerOf, memberEl } from './fx/stage';

// The effects (fx/engine.ts) load with the first throw; the animated emoji and their player load when each one lands
type Engine = typeof import('./fx/engine');
let engine: Promise<Engine> | null = null;

function loadEngine(): Promise<Engine> {
  engine ??= import('./fx/engine');
  // try again next time if the network failed
  engine.catch(() => (engine = null));
  return engine;
}

const CALM_SOUND: Record<string, (x: number) => void> = {
  '🌹': throwSfx.rose,
  '💋': throwSfx.kiss,
  '👏': throwSfx.clap,
  '🎉': throwSfx.party,
  '😂': throwSfx.laugh,
  '🍅': throwSfx.tomato,
  '🥚': throwSfx.egg,
  '💣': throwSfx.boom,
  '😡': throwSfx.angry,
  '🪓': throwSfx.axe,
  '🩴': throwSfx.chappal,
  '👊': throwSfx.punch,
  '💩': throwSfx.poop,
  '🎂': throwSfx.cake,
  '🍻': throwSfx.clink,
  '😱': throwSfx.scream,
  '🥺': throwSfx.plead,
  '🙏': throwSfx.pray,
  '😝': throwSfx.tease,
  '🤡': throwSfx.clown,
};

/** less motion: the emoji just shows on the person for a moment, with its sound */
function calm(layer: HTMLElement, flyer: Flyer, done: () => void): () => void {
  const at = centerOf(memberEl(flyer.to)) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const el = document.createElement('div');
  el.className = 'tf-calm';
  el.textContent = flyer.label ?? flyer.emoji;
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
  layer.appendChild(el);
  const timers = [
    window.setTimeout(() => (flyer.count > 1 ? throwSfx.kaching(at.x) : CALM_SOUND[flyer.emoji]?.(at.x)), 0),
    window.setTimeout(done, 1600),
  ];
  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    el.remove();
  };
}

/** one flight; everything it draws is removed when it ends or the screen changes */
function Flight({ flyer, onDone }: { flyer: Flyer; onDone: (key: number) => void }) {
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = box.current;
    if (!layer) return;
    const done = () => onDone(flyer.key);
    if (reducedMotion()) return calm(layer, flyer, done);
    let stop: (() => void) | null = null;
    let gone = false;
    loadEngine()
      .then((m) => {
        if (!gone) stop = m.play(layer, flyer, done);
      })
      .catch(() => !gone && done());
    return () => {
      gone = true;
      stop?.();
    };
  }, [flyer.key]);

  return <div ref={box} />;
}

/** emoji and coins flying between people; everyone in the room sees the same flight */
export function Flyers({ items, onDone }: { items: Flyer[]; onDone: (key: number) => void }) {
  return (
    <div className="tf-layer" aria-hidden>
      {items.map((f) => (
        <Flight key={f.key} flyer={f} onDone={onDone} />
      ))}
    </div>
  );
}
