// Pick a Ludo board, goti style and dice skin (saved per phone, shown to the room); higher levels unlock more
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-goti.css';
import '../../styles/land-ludo-dice.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { Dice } from './Dice';
import { Pawn } from './Gotis';
import { LUDO_LOOK_LISTS, saveLudoLook, useLudoLooks, type LudoLookKind } from './looks';

const TITLES: Record<LudoLookKind, string> = { board: '🎲 Board', goti: '♟️ Gotis', dice: '🎯 Dice' };

/** who sees each pick: host undefined outside a room (Profile) */
function noteOf(kind: LudoLookKind, host?: boolean): string {
  if (kind !== 'board') return 'Your gotis and dice: everyone sees them';
  if (host === undefined) return 'Board: used at the table when you are the host';
  return host ? 'Board: you are the host, everyone plays on your board' : "Board: the host's board is used at the table";
}

/** the three rows of swatches; a locked look says its level */
export function LudoLookRows({ level, host }: { level: number; host?: boolean }) {
  const looks = useLudoLooks(level);
  return (
    <div className="lu-looks">
      {(Object.keys(LUDO_LOOK_LISTS) as LudoLookKind[]).map((kind) => (
        <div key={kind} className="lu-look-group">
          <p className="label">{TITLES[kind]}</p>
          {kind !== 'dice' && <p className={cx('muted small lu-look-note', kind === 'board' && host === false && 'warn')}>{noteOf(kind, host)}</p>}
          <div className="lu-look-row" role="radiogroup" aria-label={TITLES[kind]}>
            {LUDO_LOOK_LISTS[kind].map((l) => {
              const locked = l.level > level;
              const on = looks[kind] === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  aria-label={locked ? `${l.name}, unlocks at level ${l.level}` : l.name}
                  className={cx('lu-look', on && 'on', locked && 'locked')}
                  onClick={() => saveLudoLook(kind, l.id)}
                >
                  <span className="lu-look-art">
                    {kind === 'board' && <span className={cx('lu-look-board', `bt-${l.id}`)} />}
                    {kind === 'goti' && (
                      <span className="lu-look-goti" style={{ ['--cell' as string]: '30px' }}>
                        <Pawn color="red" style={l.id} />
                      </span>
                    )}
                    {kind === 'dice' && <Dice value={5} rollSeq={0} skin={l.id} live={false} rolling={false} onRoll={() => undefined} />}
                  </span>
                  <b>{l.name}</b>
                  {locked && <small>🔒 Lv {l.level}</small>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="muted small">Saved on this phone and shown to everyone at your table.</p>
    </div>
  );
}

/** the in-game 🎨 sheet */
export function LudoLooksSheet({ level, host, onClose }: { level: number; host: boolean; onClose: () => void }) {
  return (
    <Backdrop onClose={onClose} panel="lu-looks-sheet">
      <h3>🎨 Ludo looks</h3>
      <LudoLookRows level={level} host={host} />
      <button className="btn ghost block" onClick={onClose}>
        Done
      </button>
    </Backdrop>
  );
}
