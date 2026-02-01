import { Redis } from '@upstash/redis';

if (
  !process.env['UPSTASH_REDIS_REST_URL'] ||
  !process.env['UPSTASH_REDIS_REST_TOKEN']
) {
  throw new Error('Missing Upstash Redis environment variables');
}

export const redis = Redis.fromEnv();

export const TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export function getSessionKeys(supportCode: string) {
  return {
    meta: `diag:${supportCode}:meta`,
    events: `diag:${supportCode}:events`,
    writeKeyHash: `diag:${supportCode}:writeKeyHash`,
    rateLimit: (minuteEpoch: number) =>
      `diag:${supportCode}:rate:${String(minuteEpoch)}`,
  };
}
