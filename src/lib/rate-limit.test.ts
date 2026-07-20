import { describe, expect, it } from 'vitest';
import { checkRateLimit } from './rate-limit';

// Minimal in-memory double for the two KVNamespace methods checkRateLimit
// actually uses — real KV behavior (eventual consistency, TTL semantics)
// only exists on Cloudflare's edge, so this only proves the counting logic.
class FakeKV {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

function fakeKv() {
  return new FakeKV() as unknown as KVNamespace;
}

describe('checkRateLimit', () => {
  it('allows requests under the limit', async () => {
    const kv = fakeKv();
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(kv, 'ip1', 3, 60);
      expect(result.allowed).toBe(true);
    }
  });

  it('denies requests once the limit is reached', async () => {
    const kv = fakeKv();
    await checkRateLimit(kv, 'ip2', 2, 60);
    await checkRateLimit(kv, 'ip2', 2, 60);
    const third = await checkRateLimit(kv, 'ip2', 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('tracks separate keys independently', async () => {
    const kv = fakeKv();
    await checkRateLimit(kv, 'a', 1, 60);
    const resultB = await checkRateLimit(kv, 'b', 1, 60);
    expect(resultB.allowed).toBe(true);
  });
});
