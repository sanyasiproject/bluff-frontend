import type { AnimationItem, LottiePlayer } from 'lottie-web';
import type { Stage } from './stage';

/** Noto Animated Emoji (Google, CC BY 4.0) kept in public/fx and fetched only when that throw happens */
export type FxName = 'rose' | 'kiss' | 'heart' | 'clap' | 'party' | 'joy' | 'tomato' | 'bomb' | 'boom' | 'angry' | 'punch' | 'poop' | 'cake' | 'cheers' | 'scream' | 'plead' | 'pray' | 'tease' | 'clown';

let player: Promise<LottiePlayer> | null = null;
const files = new Map<FxName, Promise<string>>();

// the player is its own small chunk, loaded with the first throw
function loadPlayer(): Promise<LottiePlayer> {
  player ??= import('lottie-web/build/player/esm/lottie_light.min.js').then((m) => m.default);
  player.catch(() => (player = null));
  return player;
}

function loadFile(name: FxName): Promise<string> {
  let file = files.get(name);
  if (!file) {
    file = fetch(`${import.meta.env.BASE_URL}fx/${name}.json`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
    files.set(name, file);
    // try again next time if the network failed
    file.catch(() => files.delete(name));
  }
  return file;
}

/** start fetching early so it's ready when the throw lands */
export function warm(name: FxName): void {
  void Promise.all([loadPlayer(), loadFile(name)]).catch(() => undefined);
}

/** an animated emoji waiting (hidden) on the layer; anim is set once it has loaded */
export interface Clip {
  box: HTMLElement;
  anim: AnimationItem | null;
}

export function clip(s: Stage, name: FxName, size: number, frame = 0): Clip {
  const box = s.add('tf-clip', '', { width: `${size}px`, height: `${size}px` });
  const c: Clip = { box, anim: null };
  Promise.all([loadPlayer(), loadFile(name)])
    .then(([lottie, text]) => {
      if (!s.isLive()) return;
      // each copy gets its own parsed data: the player changes it while it plays
      const anim = lottie.loadAnimation({
        container: box,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: JSON.parse(text),
        rendererSettings: { progressiveLoad: false, hideOnTransparent: true },
      });
      const ready = () => anim.goToAndStop(frame, true);
      if (anim.isLoaded) ready();
      else anim.addEventListener('DOMLoaded', ready);
      c.anim = anim;
      s.onStop(() => anim.destroy());
    })
    .catch(() => undefined);
  return c;
}

/** play parts of a clip one after another: [from frame, to frame, speed]; to < from plays backwards */
export function playParts(anim: AnimationItem, parts: [number, number, number][], loop = false): void {
  let i = 0;
  const next = () => {
    const [from, to, speed] = parts[i++];
    anim.setSpeed(speed);
    anim.playSegments([from, to], true);
  };
  anim.setLoop(loop);
  if (!loop) anim.addEventListener('complete', () => i < parts.length && next());
  next();
}
