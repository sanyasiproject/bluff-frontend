// A drawn illustration per game, filling a tile's art area (16:10, cropped to fit); unknown kinds get an emoji scene
import { GAME_CATALOG, type GameKind } from '../types';
import { useArtIds } from './scenes/common';
import { BluffScene } from './scenes/BluffScene';
import { ChessScene } from './scenes/ChessScene';
import { ColorWarScene } from './scenes/ColorWarScene';
import { Crazy7Scene } from './scenes/Crazy7Scene';
import { DartsScene } from './scenes/DartsScene';
import { DotsScene } from './scenes/DotsScene';
import { FallbackScene } from './scenes/FallbackScene';
import { FruitScene } from './scenes/FruitScene';
import { LudoScene } from './scenes/LudoScene';
import { RangScene } from './scenes/RangScene';
import { RmcsScene } from './scenes/RmcsScene';
import { SnakesScene } from './scenes/SnakesScene';
import { SpikesScene } from './scenes/SpikesScene';

export interface GameArtProps {
  /** a GameKind, or any future kind (drawn as its emoji) */
  kind: GameKind | (string & {});
  className?: string;
  /** override the catalog's tile colours */
  colors?: [string, string];
  /** fallback emoji when the kind has no drawing (default: the catalog emoji, else 🎮) */
  emoji?: string;
  /** 'slice' fills the box and crops (default); 'meet' shows the whole drawing */
  fit?: 'slice' | 'meet';
  /** accessible name; omitted = decorative */
  title?: string;
}

const DRAWN = { ludo: LudoScene, bluff: BluffScene, crazy7: Crazy7Scene, rang: RangScene, snakes: SnakesScene, rmcs: RmcsScene,
  darts: DartsScene, dots: DotsScene, colorwar: ColorWarScene, fruit: FruitScene, spikes: SpikesScene, chess: ChessScene } as const;

export function GameArt({ kind, className, colors, emoji, fit = 'slice', title }: GameArtProps) {
  const id = useArtIds();
  const info = GAME_CATALOG.find((g) => g.kind === kind);
  const tones: [string, string] = colors ?? info?.colors ?? ['#8b5cff', '#ff4fa3'];
  const Scene = (DRAWN as Record<string, (typeof DRAWN)[keyof typeof DRAWN]>)[kind];
  return (
    <svg
      className={className ? `nt-art ${className}` : 'nt-art'}
      viewBox="0 0 320 200"
      preserveAspectRatio={`xMidYMid ${fit}`}
      width="100%"
      height="100%"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {Scene ? <Scene id={id} colors={tones} /> : <FallbackScene id={id} colors={tones} emoji={emoji ?? info?.emoji ?? '🎮'} />}
    </svg>
  );
}
