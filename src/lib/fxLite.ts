// Big high-resolution touch tablets: Chrome runs out of GPU tiles for full-screen blur, so parts of popups never paint
const TABLET_SHORT_SIDE = 600;

/** marks <html> so the CSS drops backdrop blur on tablets (the dark see-through backgrounds stay) */
export function markFxLite() {
  const touch = navigator.maxTouchPoints > 0 || (window.matchMedia?.('(any-pointer: coarse)').matches ?? false);
  if (touch && Math.min(screen.width, screen.height) >= TABLET_SHORT_SIDE) document.documentElement.classList.add('fx-lite');
}
