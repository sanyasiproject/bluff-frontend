// Offline mode on one phone: the setup screen, then the game (a saved game resumes straight away)
import { useState } from 'react';
import { loadName } from '../lib/storage';
import { prefetchTable } from '../games/tableLoaders';
import type { OfflineSetup } from './games';
import { checkLocal, restoreLocal } from './engineBridge';
import type { LocalGame } from './localRoom';
import { OfflineSetupScreen } from './OfflineSetupScreen';
import { OfflineTable } from './OfflineTable';
import { loadGame, saveGame } from './store';

export function OfflineApp({ onExit, myName }: { onExit: () => void; myName?: string }) {
  // a saved game opens where it was; a save this version can't open is dropped once, back to the setup screen
  const [saved] = useState(() => {
    const g = loadGame();
    if (!g) return null;
    try {
      return { setup: g.setup, game: restoreLocal(g.state) };
    } catch {
      saveGame(null);
      return null;
    }
  });
  const [playing, setPlaying] = useState<{ setup: OfflineSetup; resume?: LocalGame } | null>(() => (saved ? { setup: saved.setup, resume: saved.game } : null));
  const [lastSetup, setLastSetup] = useState<OfflineSetup | null>(saved?.setup ?? null);
  const [error, setError] = useState<string | null>(null);

  if (playing)
    return (
      <OfflineTable
        key={playing.setup.seats.map((s) => s.id).join() + playing.setup.kind}
        setup={playing.setup}
        resume={playing.resume}
        onChangePlayers={() => {
          setLastSetup(playing.setup);
          setPlaying(null);
        }}
        onExit={onExit}
      />
    );
  return (
    <OfflineSetupScreen
      myName={myName ?? loadName()}
      initial={lastSetup}
      onBack={onExit}
      error={error}
      onStart={(setup) => {
        const why = checkLocal(setup);
        setError(why);
        if (why) return;
        prefetchTable(setup.kind);
        setPlaying({ setup });
      }}
    />
  );
}
