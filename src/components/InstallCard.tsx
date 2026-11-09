import { useEffect, useState } from 'react';
import { canPrompt, isInstalled, isIos, onInstallChange, promptInstall } from '../lib/install';

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
