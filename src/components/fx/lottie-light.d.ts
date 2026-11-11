// The light Lottie player (SVG only, no expressions, so no eval) has no types of its own in the ESM build
declare module 'lottie-web/build/player/esm/lottie_light.min.js' {
  import type { LottiePlayer } from 'lottie-web';
  const lottie: LottiePlayer;
  export default lottie;
}
