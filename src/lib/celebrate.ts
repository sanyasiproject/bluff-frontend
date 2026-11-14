import { reducedMotion } from './motion';

// Game-over moments drawn over everything (the results panel included); they never catch taps and clean up after themselves

const SPARKS = ['#f6c453', '#ffe08a', '#3ccf91', '#ff6b81', '#7cc4ff', '#ffffff', '#c792ff'];

/** a short-lived layer above the sheets; removed when its last animation ends */
function layer(): { el: HTMLDivElement; track: (a: Animation) => void } {
  const el = document.createElement('div');
  el.className = 'celebrate-layer';
  document.body.appendChild(el);
  let live = 0;
  const track = (a: Animation) => {
    live++;
    a.onfinish = a.oncancel = () => {
      live--;
      if (live <= 0) el.remove();
    };
  };
  return { el, track };
}

/** a positioned bit of text (emoji) on the layer */
function bit(host: HTMLElement, text: string, x: number, y: number, size: number): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'celebrate-bit';
  s.textContent = text;
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.style.fontSize = `${size}px`;
  host.appendChild(s);
  return s;
}

/** middle-top of an element on screen */
function spot(el: Element | null): { x: number; y: number; w: number } | null {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top, w: r.width } : null;
}

/** one firework: sparks burst out from a point and drift down */
function burst(host: HTMLElement, track: (a: Animation) => void, x: number, y: number, delay: number): void {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.background = SPARKS[(i + Math.floor(delay / 100)) % SPARKS.length];
    host.appendChild(dot);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const power = 60 + Math.random() * 50;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power;
    track(
      dot.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.08 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 40}px)) scale(0.5)`, opacity: 0 },
        ],
        { duration: 1100 + Math.random() * 300, delay, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'both' },
      ),
    );
  }
}

/** a few fireworks across the top of the screen over about two seconds */
export function fireworks(shots = 5): void {
  if (reducedMotion()) return;
  const { el, track } = layer();
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < shots; i++) {
    const x = w * (0.18 + Math.random() * 0.64);
    const y = h * (0.12 + Math.random() * 0.28);
    burst(el, track, x, y, i * 360 + Math.random() * 120);
  }
}

/** 🏆 rises from the bottom, bounces at the top of the screen, then floats away */
export function trophy(): void {
  if (reducedMotion()) return;
  const { el, track } = layer();
  const t = bit(el, '🏆', window.innerWidth / 2, window.innerHeight * 0.16, 76);
  track(
    t.animate(
      [
        { transform: `translate(-50%, ${window.innerHeight * 0.75}px) scale(0.4) rotate(-12deg)`, opacity: 0 },
        { transform: 'translate(-50%, 0) scale(1.15) rotate(6deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%, 8px) scale(0.95) rotate(-3deg)', opacity: 1, offset: 0.48 },
        { transform: 'translate(-50%, 0) scale(1) rotate(0deg)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%, -30px) scale(0.9)', opacity: 0 },
      ],
      { duration: 2600, easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)', fill: 'both' },
    ),
  );
}

/** 👑 drops onto an element (a seat's avatar) and stays a moment */
export function crownOn(target: Element | null, delay = 0): void {
  const at = spot(target);
  if (!at || reducedMotion()) return;
  const { el, track } = layer();
  const c = bit(el, '👑', at.x, at.y - 14, Math.max(24, Math.min(40, at.w * 0.6)));
  track(
    c.animate(
      [
        { transform: 'translate(-50%, -90px) rotate(-25deg) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, 4px) rotate(8deg) scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -4px) rotate(-4deg) scale(1)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0.85 },
        { transform: 'translate(-50%, -10px) scale(0.9)', opacity: 0 },
      ],
      { duration: 2800, delay, easing: 'ease-out', fill: 'both' },
    ),
  );
}

/** a short 🙈 rain over an element (a losing seat) */
export function monkeyRain(target: Element | null, delay = 0): void {
  const at = spot(target);
  if (!at || reducedMotion()) return;
  const { el, track } = layer();
  for (let i = 0; i < 5; i++) {
    const x = at.x + (Math.random() - 0.5) * Math.max(40, at.w);
    const m = bit(el, '🙈', x, at.y - 40, 18 + Math.random() * 8);
    track(
      m.animate(
        [
          { transform: 'translate(-50%, -30px) rotate(-15deg)', opacity: 0 },
          { transform: 'translate(-50%, 0) rotate(10deg)', opacity: 1, offset: 0.3 },
          { transform: `translate(-50%, ${50 + Math.random() * 30}px) rotate(-10deg)`, opacity: 0 },
        ],
        { duration: 1400 + Math.random() * 500, delay: delay + i * 160, easing: 'ease-in', fill: 'both' },
      ),
    );
  }
}

/** the avatar on a player's seat, or whatever stands for them on screen (my hand) */
const memberSpot = (id: string): Element | null => {
  const host = document.querySelector(`[data-member="${CSS.escape(id)}"]`);
  return host?.querySelector('.avatar') ?? host;
};

/** game over: the trophy and fireworks, a crown for each winner, 🙈 over the losers */
export function winnerMoment(winnerIds: string[], loserIds: string[]): void {
  if (reducedMotion() || winnerIds.length === 0) return;
  trophy();
  fireworks();
  winnerIds.forEach((id, i) => crownOn(memberSpot(id), 500 + i * 200));
  loserIds.forEach((id, i) => monkeyRain(memberSpot(id), 700 + i * 150));
}
