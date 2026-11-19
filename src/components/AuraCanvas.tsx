import { useEffect, useRef } from 'react';
import { AURA_PAD, makeAura } from '../lib/fx/auras';
import { animate, fitCanvas } from '../lib/fx/engine';
import { reducedMotion } from '../lib/motion';

/** a live shop aura drawn round its parent box (the parent must be positioned); pad lets light spill outside */
export function AuraCanvas({ aura, pad: minPad = 14 }: { aura: string | null | undefined; pad?: number }) {
  const pad = Math.max(minPad, (aura && AURA_PAD[aura]) || 0);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const paint = makeAura(aura);
    if (!canvas || !host || !paint) return;
    let w = 0;
    let h = 0;
    let r = 12;
    const measure = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      r = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 12;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    // only draw while it's on screen and the app is in front
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    const frame = (dt: number, t: number) => {
      if (!visible || document.hidden || w === 0) return;
      const ctx = fitCanvas(canvas, w + pad * 2, h + pad * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w + pad * 2, h + pad * 2);
      paint(ctx, { x: pad, y: pad, w, h, r }, dt, t);
    };
    if (reducedMotion()) {
      // a still picture: run it a moment so it has something in it, then stop
      let n = 0;
      const stop = animate((dt, t) => {
        frame(dt, t);
        if (++n > 40) stop();
      });
      return () => {
        stop();
        ro.disconnect();
        io.disconnect();
      };
    }
    const stop = animate(frame);
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, [aura, pad]);
  if (!aura) return null;
  return <canvas ref={ref} className="aura-canvas" aria-hidden style={{ left: -pad, top: -pad, width: `calc(100% + ${pad * 2}px)`, height: `calc(100% + ${pad * 2}px)` }} />;
}
