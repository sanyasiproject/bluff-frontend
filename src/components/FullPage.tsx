import type { ReactNode } from 'react';
import { cx } from '../lib/cards';
import { useBack } from '../lib/back';
import { BackButton } from './BackButton';

/** a full-screen page over the current screen, with a back button; className picks a sideways layout (styles/land-pages.css) */
export function FullPage({ title, onBack, children, className }: { title: string; onBack: () => void; children: ReactNode; className?: string }) {
  useBack(onBack);
  return (
    <div className={cx('page', className)} role="dialog" aria-modal aria-label={title}>
      <header className="page-head">
        <BackButton onClick={onBack} />
        <h2 className="grow">{title}</h2>
      </header>
      <div className="page-body">{children}</div>
    </div>
  );
}
