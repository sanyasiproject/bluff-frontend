import type { ReactNode } from 'react';

/** a full-screen page over the current screen, with a back button */
export function FullPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="page" role="dialog" aria-modal aria-label={title}>
      <header className="page-head">
        <button className="icon-btn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h2 className="grow">{title}</h2>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}
