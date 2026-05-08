/**
 * Request Deduplicator
 *
 * Deduplicates concurrent requests by key.
 *
 * Behavior:
 * - If multiple calls are made with the same key while a request is pending,
 *   they all receive the SAME Promise.
 * - At most ONE fetchFn executes at a time per key.
 * - Once the Promise settles (resolves OR rejects), the key is removed.
 * - Subsequent calls for the same key trigger a NEW fetch (this is NOT a cache).
 *
 * You must also expose:
 * - pendingCount: number of unique keys with pending requests
 *
 * Examples:
 *
 *   const dedup = new RequestDeduplicator<{ userId: number; name: string }>();
 *
 *   // 3 concurrent calls → 1 actual fetch
 *   const p1 = dedup.request("user:123", () => fetchUser(123));
 *   const p2 = dedup.request("user:123", () => fetchUser(123));
 *   const p3 = dedup.request("user:123", () => fetchUser(123));
 *   // p1, p2, p3 all resolve/reject with the same result
 *
 *   // Different keys → independent fetches
 *   dedup.request("user:1", fetchOne);
 *   dedup.request("user:2", fetchTwo);
 *
 *   // Errors are shared too
 *   const p1 = dedup.request("user:123", failingFetch);
 *   const p2 = dedup.request("user:123", failingFetch);
 *   // both reject with the same error
 *
 *   // After a request settles, the next call triggers a new fetch
 *   await dedup.request("user:1", fetchA);
 *   dedup.request("user:1", fetchB); // fetchB runs again (not deduped)
 *
 *   // pendingCount tracks unique keys with pending requests
 *   dedup.request("user:1", slowFetch);
 *   dedup.request("user:2", slowFetch);
 *   dedup.request("user:1", slowFetch); // duplicate
 *   dedup.pendingCount; // 2
 */

type FetchFn<T> = () => Promise<T>;

interface IRequestDeduplicator<T> {
  /**
   * Returns the existing promise if the key is already pending,
   * otherwise runs fetchFn and tracks it until it settles.
   */
  request(key: string, fetchFn: FetchFn<T>): Promise<T>;

  /** Number of unique keys with a pending request. */
  get pendingCount(): number;
}

// Implement:
class RequestDeduplicator<T> implements IRequestDeduplicator<T> {
  request(key: string, fetchFn: FetchFn<T>): Promise<T> {
    // Implement
  }

  get pendingCount(): number {
    // Implement
    return 0;
  }
}
