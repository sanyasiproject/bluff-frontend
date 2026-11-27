// The voice choice (Girl / Boy / Cute) with a Test line, shared by Profile, the lobby drawer and every table's menus
import { useEffect, useState } from 'react';
import { cx } from '../lib/cards';
import { getVoiceGender, isSoundOn, onVoicesChanged, setVoiceGender, speakLine, speechSupported, unlockSpeech, voiceNames, type VoiceGender } from '../lib/speech';
import { LUDO_QUICK_MESSAGES, LUDO_QUICK_VOICE } from '../types';

const CHOICES: [VoiceGender, string][] = [
  ['female', 'Girl'],
  ['male', 'Boy'],
  ['cute', 'Cute 🎀'],
];

/** says a Ludo quick line with feeling, in the chosen voice */
export function testVoice(): void {
  unlockSpeech();
  speakLine(LUDO_QUICK_VOICE[0], LUDO_QUICK_MESSAGES[0]);
}

/** per-phone voice picker; compact drops the panel frame for menus */
export function VoiceSettings({ compact = false }: { compact?: boolean }) {
  const [gender, setGender] = useState<VoiceGender>(getVoiceGender);
  const [, refresh] = useState(0);
  // voices load late on some phones: refresh the note when they arrive
  useEffect(() => onVoicesChanged(() => refresh((n) => n + 1)), []);
  if (!speechSupported) return null;

  const muted = !isSoundOn();
  const { hi } = voiceNames();
  const choose = (next: VoiceGender) => {
    setVoiceGender(next);
    setGender(next);
    testVoice();
  };

  return (
    <section className={cx('voice-set', !compact && 'panel', compact && 'compact')} aria-label="Voice">
      <div className="voice-set-top">
        <b>🗣️ Voice</b>
        <div className="mini-seg" role="group" aria-label="Voice">
          {CHOICES.map(([g, label]) => (
            <button key={g} type="button" className={cx(gender === g && 'on')} aria-pressed={gender === g} onClick={() => choose(g)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost small" onClick={testVoice}>
          🔊 Test
        </button>
      </div>
      {muted && <p className="voice-set-hint">🔇 Sound is off, so Test stays quiet. Turn sound on to hear it.</p>}
      <p className="voice-set-note">{hi ? `Hindi: ${hi}` : 'No Hindi voice on this phone — lines are read in English letters'}</p>
    </section>
  );
}
