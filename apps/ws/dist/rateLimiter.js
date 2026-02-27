/**
 * Simple token-bucket rate limiter per client ID.
 * Lightweight alternative to a full library.
 */
const buckets = new Map();
const CAPACITY = 20; // max burst
const REFILL_RATE = 10; // tokens per second
const REFILL_INTERVAL = 1000;
export function isRateLimited(clientId) {
    const now = Date.now();
    let bucket = buckets.get(clientId);
    if (!bucket) {
        bucket = { tokens: CAPACITY, lastRefill: now };
        buckets.set(clientId, bucket);
    }
    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= REFILL_INTERVAL) {
        const newTokens = Math.floor((elapsed / REFILL_INTERVAL) * REFILL_RATE);
        bucket.tokens = Math.min(CAPACITY, bucket.tokens + newTokens);
        bucket.lastRefill = now;
    }
    if (bucket.tokens <= 0)
        return true;
    bucket.tokens -= 1;
    return false;
}
export function removeBucket(clientId) {
    buckets.delete(clientId);
}
//# sourceMappingURL=rateLimiter.js.map