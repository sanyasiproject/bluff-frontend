import { io } from 'socket.io-client';
import { PLUGGED_GAMES } from '../types';
import { loadAuthToken } from './storage';

// Locally the server runs on port 3001 of the same machine, which also works from phones on home Wi-Fi
const envUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim().replace(/\/$/, '');
export const SERVER_URL = envUrl || `${location.protocol}//${location.hostname}:3001`;

// the login token is read on every (re)connect, so the server knows which account this is
export const socket = io(SERVER_URL, {
  reconnectionDelayMax: 4000,
  // straight to a WebSocket (no polling round trips first); polling stays as the fallback for networks that block it
  transports: ['websocket', 'polling'],
  tryAllTransports: true,
  // ready: this app has the lobby's Ready button (older apps never hold up a start)
  // games: the registry games this app can draw (the server refuses to start one an app lacks)
  // twists: this app shows the Kismat card and makes Seedhi claims; rang: it plays Rang and Crazy 7's power cards
  auth: (cb) => cb({ token: loadAuthToken() ?? '', ready: true, twists: true, rang: true, games: [...PLUGGED_GAMES] }),
});

/** reconnect so the server picks up a login or logout */
export function reconnectSocket(): void {
  socket.disconnect();
  socket.connect();
}

/** Error message coming from the server's game rules */
export class ServerError extends Error {}

/** the server didn't answer in time */
export class TimeoutError extends Error {}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

/** room and game events wait until room:rejoin has finished after a reconnect */
const WAITS_FOR_REJOIN = /^(game|c7|rang|room|chat|ludo):/;
let rejoining = false;

/** useBluff marks the rejoin in flight so moves are refused until the seat is back */
export function setRejoining(on: boolean): void {
  rejoining = on;
}

export async function request<T extends object = object>(event: string, payload: object = {}): Promise<T> {
  // offline: fail at once instead of queueing a move that lands after the rejoin
  if (!socket.connected) throw new Error('Reconnecting…');
  if (rejoining && event !== 'room:rejoin' && WAITS_FOR_REJOIN.test(event)) throw new Error('Reconnecting…');
  let res: Ack<T>;
  try {
    res = await socket.timeout(10_000).emitWithAck(event, payload);
  } catch {
    throw new TimeoutError('No connection to the server, try again');
  }
  if (!res.ok) throw new ServerError(res.error);
  return res;
}
