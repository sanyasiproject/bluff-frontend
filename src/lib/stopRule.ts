// The Stop game confirm: casual tables stop with no winner; on staked and ranked tables stopping is my forfeit
import type { RoomView } from '../types';

export interface StopText {
  title: string;
  body: string;
  action: string;
}

const CASUAL: StopText = {
  title: 'Stop this game for everyone?',
  body: 'Nobody wins or loses and no coins move. Everyone goes back to the lobby.',
  action: 'Stop game',
};

const STRICT: StopText = {
  title: 'Stop and forfeit?',
  body: 'On staked and ranked tables, stopping counts as your forfeit: you lose and the others play on.',
  action: 'Forfeit',
};

export const stopText = (view: Pick<RoomView, 'strict'>): StopText => (view.strict ? STRICT : CASUAL);
