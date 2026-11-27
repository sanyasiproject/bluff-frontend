// Raja Mantri moments outside React: points flying to a score, the Chor running off, handcuffs and the siren flash
import { reducedMotion } from '../../lib/motion';

const mid = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** one short-lived thing on screen, removed when its animation ends */
function spawn(cls: string, text: string, at: { x: number; y: number }): HTMLElement {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  el.style.left = `${at.x}px`;
  el.style.top = `${at.y}px`;
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

/** "+800" flies from a chit to its player's score */
export function flyPoints(from: Element | null | undefined, to: Element | null | undefined, text: string, delay: number): void {
  if (!from || !to || reducedMotion()) return;
  const a = mid(from);
  const b = mid(to);
  const el = spawn('rm-fly', text, a);
  const anim = el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -90%) scale(1.25)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(0.8)`, opacity: 1, offset: 0.9 },
      { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(0.5)`, opacity: 0 },
    ],
    { duration: 1300, delay, easing: 'cubic-bezier(0.4, 0, 0.3, 1)', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}

/** the Chor got away: he runs off the table to the nearest side */
export function chorRuns(from: Element | null | undefined): void {
  if (!from || reducedMotion()) return;
  const a = mid(from);
  const right = a.x > window.innerWidth / 2;
  const el = spawn('rm-runner', right ? '🏃‍♂️💨' : '💨🏃‍♂️', a);
  const dx = (right ? window.innerWidth - a.x : -a.x) + (right ? 80 : -80);
  const flip = right ? -1 : 1;
  const anim = el.animate(
    [
      { transform: `translate(-50%, -50%) scale(${flip}, 1)`, opacity: 0 },
      { transform: `translate(-50%, -70%) scale(${flip * 1.3}, 1.3)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px), -60%) scale(${flip}, 1)`, opacity: 1 },
    ],
    { duration: 1500, delay: 400, easing: 'ease-in', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}

/** caught: handcuffs snap onto the Chor's chit */
export function cuffs(on: Element | null | undefined): void {
  if (!on || reducedMotion()) return;
  const el = spawn('rm-cuffs', '⛓️', mid(on));
  const anim = el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(3) rotate(-30deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(0.9) rotate(8deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1.1) rotate(0deg)', opacity: 1, offset: 0.45 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.9 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 0 },
    ],
    { duration: 2400, delay: 300, easing: 'ease-out', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}
