/** round back button with a drawn chevron, so it sits dead centre on every phone font */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="icon-btn" aria-label="Back" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
