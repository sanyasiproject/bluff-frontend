// Screen and table downloads: a failed chunk is fetched once more before the error screen shows
const RETRY_MS = 800;

/** wraps a dynamic import so one failed download is tried again */
export function retryImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch(
      () =>
        new Promise<T>((resolve, reject) => {
          window.setTimeout(() => load().then(resolve, reject), RETRY_MS);
        }),
    );
}
