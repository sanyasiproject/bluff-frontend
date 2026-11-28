// ?diag=1: a small box with the screen facts that decide the layout, for checking a real device
import { insideShell, wantsShell } from './landscapeShell';

export function showDiag() {
  if (!new URLSearchParams(location.search).has('diag') || insideShell()) return;
  const mode = ['fullscreen', 'standalone', 'minimal-ui', 'browser'].find((m) => matchMedia(`(display-mode: ${m})`).matches) ?? '?';
  const lines = [
    `screen ${screen.width}×${screen.height} @${devicePixelRatio}`,
    `window ${innerWidth}×${innerHeight}`,
    `touch ${navigator.maxTouchPoints} · ${mode}`,
    `frame ${wantsShell() ? 'on' : 'off'} · fx-lite ${document.documentElement.classList.contains('fx-lite') ? 'on' : 'off'}`,
    navigator.userAgent,
  ];
  const box = document.createElement('pre');
  box.textContent = lines.join('\n');
  box.style.cssText =
    'position:fixed;z-index:2147483647;left:8px;bottom:8px;max-width:60vw;margin:0;padding:8px 10px;font:12px/1.4 monospace;white-space:pre-wrap;color:#fff;background:rgba(0,0,0,.85);border-radius:8px;pointer-events:none';
  const add = () => document.body.appendChild(box);
  if (document.body) add();
  else addEventListener('DOMContentLoaded', add);
}
