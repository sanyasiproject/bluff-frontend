import { SERVER_URL } from './socket';

/** error from the accounts API, with its HTTP status (0 = no connection) */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST';
  body?: object;
  token?: string | null;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api${path}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: {
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No connection to the server, try again');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong');
  return data as T;
}

/** true when the server has a database, i.e. accounts are available */
export async function accountsAvailable(): Promise<boolean> {
  const res = await fetch(`${SERVER_URL}/health`);
  const data = (await res.json()) as { accounts?: string };
  return data.accounts === 'on';
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');
