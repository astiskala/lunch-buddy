import { VercelRequest } from '@vercel/node';
import { redis } from './redis';

export function resolveClientIp(request: VercelRequest): string {
  const headerValue = request.headers['x-forwarded-for'];
  if (typeof headerValue === 'string') {
    const ip = headerValue.split(',', 1)[0]?.trim();
    if (ip) {
      return ip;
    }
  } else if (Array.isArray(headerValue) && headerValue.length > 0) {
    const ip = headerValue[0]?.split(',', 1)[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  return request.socket.remoteAddress ?? 'unknown';
}

export async function checkIpRateLimit(
  request: VercelRequest,
  limit: number,
  action: string
): Promise<boolean> {
  const clientIp = resolveClientIp(request);
  const minuteEpoch = Math.floor(Date.now() / 60_000);
  const rateLimitKey = `diag:ip:${clientIp}:${action}:${String(minuteEpoch)}`;

  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, 60);
  }
  return count <= limit;
}
