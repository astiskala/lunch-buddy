import { VercelRequest } from '@vercel/node';
import { redis } from './redis';

export function resolveClientIp(req: VercelRequest): string {
  const headerValue = req.headers['x-forwarded-for'];
  if (typeof headerValue === 'string') {
    const ip = headerValue.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  } else if (Array.isArray(headerValue) && headerValue.length > 0) {
    const ip = headerValue[0]?.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  return req.socket.remoteAddress ?? 'unknown';
}

export async function checkIpRateLimit(
  req: VercelRequest,
  limit: number,
  action: string
): Promise<boolean> {
  const clientIp = resolveClientIp(req);
  const minuteEpoch = Math.floor(Date.now() / 60000);
  const rateLimitKey = `diag:ip:${clientIp}:${action}:${String(minuteEpoch)}`;

  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, 60);
  }
  return count <= limit;
}
