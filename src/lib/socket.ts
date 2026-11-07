import { io } from 'socket.io-client';

// Locally the server runs on port 3001 of the same machine, which also works from phones on home Wi-Fi
const envUrl = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim().replace(/\/$/, '');
export const SERVER_URL = envUrl || `${location.protocol}//${location.hostname}:3001`;

export const socket = io(SERVER_URL, { reconnectionDelayMax: 4000 });

/** Error message coming from the server's game rules */
export class ServerError extends Error {}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function request<T extends object = object>(event: string, payload: object = {}): Promise<T> {
  let res: Ack<T>;
  try {
    res = await socket.timeout(10_000).emitWithAck(event, payload);
  } catch {
    throw new Error('No connection to the server, try again');
  }
  if (!res.ok) throw new ServerError(res.error);
  return res;
}
