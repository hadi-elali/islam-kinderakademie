// Merge simultaneous refreshes and serialize reads. A write completed during an
// existing read must get a subsequent read, rather than reuse a stale response.
export function createRefreshQueue<K>(load: (keys: K[] | undefined) => Promise<void>) {
  let running = false;
  let full = false;
  const keys = new Set<K>();
  let waiters: { resolve: () => void; reject: (reason: unknown) => void }[] = [];

  async function drain() {
    while (waiters.length) {
      const batch = waiters;
      const selected = full ? undefined : [...keys];
      waiters = [];
      full = false;
      keys.clear();
      try {
        await load(selected);
        batch.forEach(({ resolve }) => resolve());
      } catch (reason) {
        batch.forEach(({ reject }) => reject(reason));
      }
    }
    running = false;
  }

  return (selected?: readonly K[]) => {
    if (selected === undefined) full = true;
    selected?.forEach((key) => keys.add(key));
    const result = new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
    if (!running) {
      running = true;
      void Promise.resolve().then(drain);
    }
    return result;
  };
}
