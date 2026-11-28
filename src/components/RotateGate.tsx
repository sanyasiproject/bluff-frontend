/** phones held upright: a full screen "turn your phone" card over the app (CSS shows it only in portrait on touch screens) */
export function RotateGate() {
  return (
    <div className="rotate-gate" role="alert" aria-live="polite">
      <div className="rotate-phone" aria-hidden>
        <span className="rotate-screen">
          <i />
          <i />
          <i />
        </span>
      </div>
      <h2>Turn your phone</h2>
      <p>Game Baithak Wide plays sideways, like a real game table.</p>
      <p className="rotate-tip">Just hold the phone sideways.</p>
    </div>
  );
}
