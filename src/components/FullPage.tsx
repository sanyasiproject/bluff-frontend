import type { ReactNode } from 'react';
import { useBack } from '../lib/back';
import { BackButton } from './BackButton';

/** a full-screen page over the current screen, with a back button */
export function FullPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  useBack(onBack);
  return (
    <div className="page" role="dialog" aria-modal aria-label={title}>
      <header className="page-head">
        <BackButton onClick={onBack} />
        <h2 className="grow">{title}</h2>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}
