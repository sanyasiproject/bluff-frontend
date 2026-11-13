import { useState, type FormEvent } from 'react';
import { errorText } from '../lib/api';
import { askPermission, autoPush } from '../lib/push';
import { cx } from '../lib/cards';
import type { Auth } from '../useAuth';
import { Backdrop } from './Overlays';

export type AccountMode = 'login' | 'register';

/** log in or create an account; guests can still play without one */
export function AccountSheet({ initial, auth, onClose }: { initial: AccountMode; auth: Auth; onClose: () => void }) {
  const [mode, setMode] = useState<AccountMode>(initial);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // invite notifications are on by default: the phone asks now, while this tap still counts
    const permission = auth.pushInvites === true ? askPermission() : null;
    setBusy(true);
    setError('');
    try {
      const res = mode === 'login' ? await auth.login(username, password) : await auth.register(username, password, displayName.trim());
      void autoPush(res.token, res.user.id, permission);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="seg">
        {(['login', 'register'] as const).map((m) => (
          <button key={m} type="button" className={cx('option', mode === m && 'on')} onClick={() => setMode(m)}>
            <b>{m === 'login' ? 'Log in' : 'Sign up'}</b>
            <span>{m === 'login' ? 'I have an account' : 'New here, free'}</span>
          </button>
        ))}
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="label" htmlFor="acc-user">
          Username
        </label>
        <input
          id="acc-user"
          className="input"
          value={username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          placeholder="e.g. ravi_07"
          onChange={(e) => setUsername(e.target.value)}
        />
        {mode === 'register' && (
          <>
            <label className="label" htmlFor="acc-name">
              Name at the table
            </label>
            <input
              id="acc-name"
              className="input"
              value={displayName}
              maxLength={16}
              placeholder="e.g. Ravi"
              autoComplete="nickname"
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        )}
        <label className="label" htmlFor="acc-pass">
          Password
        </label>
        <input
          id="acc-pass"
          className="input"
          type="password"
          value={password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? 'At least 8 characters' : ''}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary block" disabled={busy || !username.trim() || !password}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
      <p className="muted small center-text">Your wins, stats and coins are saved to your account. Guests can still play without one.</p>
    </Backdrop>
  );
}
