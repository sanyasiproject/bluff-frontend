// Chess screens loaded on first use, so the chess library and engine stay out of the main download
import { lazy, Suspense, type ComponentProps } from 'react';

const Rules = lazy(() => import('./ChessRules').then((m) => ({ default: m.ChessRules })));
const Settings = lazy(() => import('./ChessSettings').then((m) => ({ default: m.ChessSettings })));
const Profile = lazy(() => import('./ChessProfile').then((m) => ({ default: m.ChessProfile })));

export function ChessRulesLazy(props: ComponentProps<typeof Rules>) {
  return (
    <Suspense fallback={<p className="muted small">Loading the rules…</p>}>
      <Rules {...props} />
    </Suspense>
  );
}

export function ChessSettingsLazy(props: ComponentProps<typeof Settings>) {
  return (
    <Suspense fallback={<p className="muted small">Loading…</p>}>
      <Settings {...props} />
    </Suspense>
  );
}

export function ChessProfileLazy(props: ComponentProps<typeof Profile>) {
  return (
    <Suspense fallback={<p className="muted small">Loading…</p>}>
      <Profile {...props} />
    </Suspense>
  );
}
