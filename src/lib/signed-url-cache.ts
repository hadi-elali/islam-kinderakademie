// One instance per authenticated AcademyDataProvider. Never persist private URLs.
export class SignedUrlCache {
  private entries = new Map<string, { expiresAt: number; url: string }>();
  private pending = new Map<string, Promise<string>>();
  private generation = 0;

  constructor(private now: () => number = Date.now) {}

  clear() {
    this.generation += 1;
    this.entries.clear();
    this.pending.clear();
  }

  async get(bucket: string, path: string, lifetimeSeconds: number, sign: () => Promise<string>) {
    const key = JSON.stringify([bucket, path]);
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.url;
    this.entries.delete(key);
    const pending = this.pending.get(key);
    if (pending) return pending;

    const generation = this.generation;
    // Start the lifetime before the request; leave a margin for network/clock skew.
    const expiresAt = this.now() + Math.max(0, lifetimeSeconds - 30) * 1000;
    const request = Promise.resolve().then(sign).then((url) => {
      if (url && generation === this.generation) {
        this.entries.set(key, { expiresAt, url });
        // Bound memory even when many different files are opened in one session.
        if (this.entries.size > 200) this.entries.delete(this.entries.keys().next().value!);
      }
      return url;
    }).finally(() => {
      if (this.pending.get(key) === request) this.pending.delete(key);
    });
    this.pending.set(key, request);
    return request;
  }
}
