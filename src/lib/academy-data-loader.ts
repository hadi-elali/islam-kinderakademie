import { createRefreshQueue } from '@/lib/refresh-queue';

// One loader per authenticated data context. Successful data stays in the
// existing context; deferred groups are fetched only when a screen needs them.
export function createAcademyDataLoader<K>(
  initialKeys: readonly K[],
  load: (keys: K[], full: boolean) => Promise<void>,
  dependencies: ReadonlyMap<K, readonly K[]> = new Map()
) {
  const requested = new Set(initialKeys);
  const loaded = new Set<K>();
  const pending = new Map<K, Promise<void>>();
  const request = createRefreshQueue<K>(async (selected) => {
    const keys = selected ?? [...requested];
    await load(keys, selected === undefined);
    keys.forEach((key) => loaded.add(key));
  });

  return {
    refresh(keys?: readonly K[]) {
      keys?.forEach((key) => requested.add(key));
      return request(keys);
    },
    async ensure(keys: readonly K[]) {
      keys.forEach((key) => requested.add(key));
      const missing = [...new Set(keys)].filter((key) => !loaded.has(key));
      const fresh = missing.filter((key) => !pending.has(key));
      if (fresh.length) {
        // When a deferred group first loads, refresh its related records too.
        // Otherwise new answer options could refer to old question IDs.
        const selected = [...new Set(fresh.flatMap((key) => [key, ...dependencies.get(key) ?? []]))];
        selected.forEach((key) => requested.add(key));
        const next = request(selected).finally(() => {
          fresh.forEach((key) => { if (pending.get(key) === next) pending.delete(key); });
        });
        fresh.forEach((key) => pending.set(key, next));
      }
      await Promise.all([...new Set(missing.map((key) => pending.get(key)))]);
    },
  };
}
