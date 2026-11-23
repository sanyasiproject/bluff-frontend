import { useEffect, useState } from 'react';
import { canPrompt, isInstalled, isIos, onInstallChange, promptInstall } from '../lib/install';
import { Backdrop } from './Overlays';

/** Offers "Install app"; hidden once Bluff is opened from the home screen */
export function InstallCard() {
  const [, refresh] = useState(0);
  const [showSteps, setShowSteps] = useState(false);
  useEffect(() => onInstallChange(() => refresh((n) => n + 1)), []);

  if (isInstalled()) return null;
  const ios = isIos();

  const install = async () => {
    if (canPrompt()) await promptInstall();
    else setShowSteps(true);
  };

  return (
    <section className="panel install">
      <div className="install-row">
        <img src="/icons/icon-192.png" alt="" className="install-icon" />
        <div className="grow">
          <b>Get the Bluff app</b>
          <p className="muted small">Free · no app store</p>
        </div>
        <button className="btn small primary" onClick={install}>
          Install
        </button>
      </div>
      {showSteps && (
        <ol className="install-steps">
          {ios ? (
            <>
              <li>
                In Safari, tap <b>Share</b> (the square with an arrow ⬆)
              </li>
              <li>
                Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>
              </li>
              <li>Open Bluff from your home screen</li>
            </>
          ) : (
            <>
              <li>
                Open the browser menu <b>⋮</b>
              </li>
              <li>
                Tap <b>Install app</b> or <b>Add to Home screen</b>
              </li>
              <li>Open Bluff from your home screen</li>
            </>
          )}
        </ol>
      )}
    </section>
  );
}

/** the iPhone / browser-menu steps to add Bluff to the home screen */
function InstallSteps({ ios }: { ios: boolean }) {
  return (
    <ol className="install-steps">
      {ios ? (
        <>
          <li>
            In Safari, tap <b>Share</b> (the square with an arrow ⬆)
          </li>
          <li>
            Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>
          </li>
          <li>Open Bluff from your home screen</li>
        </>
      ) : (
        <>
          <li>
            Open the browser menu <b>⋮</b>
          </li>
          <li>
            Tap <b>Install app</b> or <b>Add to Home screen</b>
          </li>
          <li>Open Bluff from your home screen</li>
        </>
      )}
    </ol>
  );
}

/** Home dock: 📲 Get app, only when the browser can install it or on iPhone (which gets the steps) */
export function GetAppButton() {
  const [, refresh] = useState(0);
  const [steps, setSteps] = useState(false);
  useEffect(() => onInstallChange(() => refresh((n) => n + 1)), []);

  const ios = isIos();
  if (isInstalled() || (!canPrompt() && !ios && !steps)) return null;

  const install = async () => {
    if (canPrompt()) await promptInstall();
    else setSteps(true);
  };

  return (
    <>
      <button type="button" className="dock-item" onClick={() => void install()}>
        <span className="dock-icon" aria-hidden>
          📲
        </span>
        <span className="dock-label">Get app</span>
      </button>
      {steps && (
        <Backdrop center onClose={() => setSteps(false)} panel="hp-steps">
          <div className="install-pop">
            <div className="install-row">
              <img src="/icons/icon-192.png" alt="" className="install-icon" />
              <div className="grow">
                <b>Get the Bluff app</b>
                <p className="muted small">Free · no app store</p>
              </div>
            </div>
            <InstallSteps ios={ios} />
            <button className="btn primary block" onClick={() => setSteps(false)}>
              Got it
            </button>
          </div>
        </Backdrop>
      )}
    </>
  );
}
