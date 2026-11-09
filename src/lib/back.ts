import { useEffect, useRef } from 'react';

// The phone's back button closes one step at a time: the newest open sheet or page first, then the
// screen's own back (leave the lobby, open the game menu). Only one extra history entry is kept while
// anything can go back, so back never replays every screen that was opened, and on the home page with
// nothing open it leaves the app as usual.

type Entry = { run: () => void };

const stack: Entry[] = [];
/** our extra history entry is in place; a reload keeps it (and its state), so start from there */
let trapped = history.state?.bluffBack === true;
/** the next popstate came from our own history.back(), not the user */
let ignoreNextPop = false;
let dropTimer: number | null = null;

function sync(): void {
  if (stack.length > 0) {
    if (dropTimer !== null) {
      clearTimeout(dropTimer);
      dropTimer = null;
    }
    if (!trapped) {
      history.pushState({ bluffBack: true }, '');
      trapped = true;
    }
  } else if (trapped && dropTimer === null) {
    // closed with an on-screen button: drop the extra entry so the next back leaves the app.
    // Waits a moment, since switching screens unmounts one handler just before mounting the next
    dropTimer = window.setTimeout(() => {
      dropTimer = null;
      if (stack.length > 0 || !trapped) return;
      trapped = false;
      ignoreNextPop = true;
      history.back();
    }, 50);
  }
}

window.addEventListener('popstate', () => {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  trapped = false;
  stack[stack.length - 1]?.run();
  // whatever is still open after this step needs the extra entry again
  setTimeout(sync, 0);
});

// reloaded on our extra entry with nothing open yet: drop it unless a screen claims it first
if (trapped) sync();

/** while mounted with a handler, the phone's back button runs it instead of leaving the page */
export function useBack(onBack: (() => void) | undefined): void {
  const ref = useRef(onBack);
  ref.current = onBack;
  const enabled = onBack !== undefined;

  useEffect(() => {
    if (!enabled) return;
    const entry: Entry = { run: () => ref.current?.() };
    stack.push(entry);
    sync();
    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      sync();
    };
  }, [enabled]);
}
