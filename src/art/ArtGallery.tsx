// Dev only (?art=1): every night-theme piece on the night background at several sizes
import type { CSSProperties, ReactNode } from 'react';
import '../styles/night.css';
import { BaithakLogo, BaithakWordmark } from './BaithakLogo';
import { GameArt } from './GameArt';
import { Icon, ICON_NAMES } from './icons';

const KINDS = ['ludo', 'bluff', 'crazy7', 'rang', 'snakes', 'rmcs', 'darts', 'dots', 'colorwar', 'fruit', 'spikes', 'carrom'] as const;
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20 };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="nt-panel" style={{ padding: 20, marginBottom: 20 }}>
      <h2 className="nt-title" style={{ margin: '0 0 14px', fontSize: 18 }}>{title}</h2>
      {children}
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: 6 }}>
      {children}
      <figcaption className="nt-faint" style={{ fontSize: 12 }}>{label}</figcaption>
    </figure>
  );
}

function Tile({ kind, width }: { kind: string; width: number }) {
  return (
    <div style={{ width, aspectRatio: '16 / 10', borderRadius: Math.max(8, width / 18), overflow: 'hidden', boxShadow: '0 8px 24px rgba(5,2,20,.5)' }}>
      <GameArt kind={kind} />
    </div>
  );
}

export function ArtGallery() {
  return (
    <div className="nt-night" style={{ position: 'fixed', inset: 0, overflow: 'auto', padding: 24, boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <BaithakLogo size={56} className="nt-pop" />
        <BaithakWordmark size={44} />
      </header>

      <Section title="Logo">
        <div style={row}>
          {[32, 64, 120, 240].map((s) => (
            <Labelled key={s} label={`${s}px`}><BaithakLogo size={s} /></Labelled>
          ))}
        </div>
      </Section>

      <Section title="Wordmark">
        <div style={row}>
          {[24, 40, 72].map((s) => (
            <Labelled key={s} label={`${s}px`}><BaithakWordmark size={s} /></Labelled>
          ))}
        </div>
      </Section>

      <Section title="Game art">
        {[400, 160, 64].map((w) => (
          <div key={w} style={{ ...row, marginBottom: 18 }}>
            {KINDS.map((k) => (
              <Labelled key={k} label={`${k} ${w}px`}><Tile kind={k} width={w} /></Labelled>
            ))}
          </div>
        ))}
      </Section>

      <Section title="Icons">
        {[20, 32, 64].map((s) => (
          <div key={s} style={{ ...row, marginBottom: 14 }}>
            {ICON_NAMES.map((n) => (
              <Labelled key={n} label={s === 32 ? n : ''}><Icon name={n} size={s} /></Labelled>
            ))}
          </div>
        ))}
        <div style={{ ...row, color: '#3a2400' }}>
          {ICON_NAMES.map((n) => (
            <span key={n} style={{ background: 'linear-gradient(#ffd75e,#ffab1a)', borderRadius: 12, padding: 6, display: 'inline-flex' }}>
              <Icon name={n} size={28} />
            </span>
          ))}
        </div>
      </Section>

      <Section title="Controls">
        <div style={{ ...row, alignItems: 'center', marginBottom: 16 }}>
          <button className="nt-btn big"><Icon name="play" size={22} /> Play Ludo</button>
          <button className="nt-btn">Create a room</button>
          <button className="nt-btn ghost"><Icon name="back" size={20} /> Back</button>
          <button className="nt-btn" disabled>Disabled</button>
          <span className="nt-badge new">New</span>
          <span className="nt-badge">2–4 players</span>
        </div>
        <div style={{ ...row, alignItems: 'center', marginBottom: 16 }}>
          <button className="nt-chip on">All</button>
          <button className="nt-chip">Cards</button>
          <button className="nt-chip">Board</button>
          <button className="nt-chip"><Icon name="friends" size={18} /> With friends</button>
        </div>
        <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
          <div className="nt-bar" style={{ '--nt-pct': 62 } as CSSProperties} />
          <div className="nt-bar gold" style={{ '--nt-pct': 35 } as CSSProperties} />
          <div className="nt-bar" style={{ '--nt-pct': 90 } as CSSProperties}><i /></div>
        </div>
      </Section>
    </div>
  );
}
