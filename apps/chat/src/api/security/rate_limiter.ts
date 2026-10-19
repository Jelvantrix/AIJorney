export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class TokenBucketLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  constructor(
    private readonly capacity = 60,
    private readonly refillRatePerSec = 2 // 120 requests per minute
  ) {}

  public check(key: string): RateLimitStatus {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillRatePerSec);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterSeconds: 0,
      };
    }

    const missing = 1 - bucket.tokens;
    const retryAfter = Math.ceil(missing / this.refillRatePerSec);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
    };
  }

  // Periodic cleanup of stale IPs
  public pruneStale(maxAgeMs = 3600000) {
    const now = Date.now();
    for (const [key, val] of this.buckets.entries()) {
      if (now - val.lastRefill > maxAgeMs) {
        this.buckets.delete(key);
      }
    }
  }
}

export const GlobalRateLimiter = new TokenBucketLimiter(30, 1.5);
