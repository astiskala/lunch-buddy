import { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, getSessionKeys, TTL } from '../_lib/redis';
import { checkIpRateLimit } from '../_lib/rate-limit';
import {
  hashWriteKey,
  safeCompare,
  normalizeSupportCode,
  isValidSupportCode,
} from '../_lib/utils';

const MAX_EVENTS_PER_REQ = 50;
const MAX_EVENT_SIZE = 8192; // 8KB
const RATE_LIMIT_PER_MIN = 60;
const IP_RATE_LIMIT_PER_MIN = 120;
const MAX_STORED_EVENTS = 1000;

interface DiagnosticSessionMeta {
  supportCode: string;
  sessionId: string;
  appVersion?: string;
  userAgent?: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt?: number;
}

function resolveRemainingTtlSeconds(expiresAt: number | undefined): number {
  if (!expiresAt || !Number.isFinite(expiresAt)) {
    return TTL;
  }

  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    const methodStr = req.method ?? 'UNKNOWN';
    return res.status(405).end(`Method ${methodStr} Not Allowed`);
  }

  const {
    supportCode: rawSupportCode,
    writeKey,
    events,
  } = req.body as {
    supportCode?: string;
    writeKey: string;
    events: unknown[];
  };

  if (!rawSupportCode || !writeKey || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const supportCode = normalizeSupportCode(rawSupportCode);
  if (!isValidSupportCode(supportCode)) {
    return res.status(400).json({ error: 'Invalid supportCode format' });
  }

  const keys = getSessionKeys(supportCode);

  try {
    // 0. Shared endpoint abuse resistance
    if (!(await checkIpRateLimit(req, IP_RATE_LIMIT_PER_MIN, 'event'))) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // 1. Validate writeKey
    const [storedHash, meta] = await Promise.all([
      redis.get<string>(keys.writeKeyHash),
      redis.get<DiagnosticSessionMeta>(keys.meta),
    ]);

    if (!storedHash || !meta) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const providedHash = await hashWriteKey(writeKey);
    if (!safeCompare(providedHash, storedHash)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ttlSeconds = resolveRemainingTtlSeconds(meta.expiresAt);
    if (ttlSeconds <= 0) {
      await redis.del(keys.meta, keys.events, keys.writeKeyHash);
      return res.status(410).json({ error: 'Session expired' });
    }

    // 2. Rate limiting
    const minuteEpoch = Math.floor(Date.now() / 60000);
    const rateLimitKey = keys.rateLimit(minuteEpoch);
    const currentCount = await redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await redis.expire(rateLimitKey, 60);
    }
    if (currentCount > RATE_LIMIT_PER_MIN) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // 3. Process events
    const validEvents = events
      .slice(0, MAX_EVENTS_PER_REQ)
      .map(e => JSON.stringify(e))
      .filter(e => e.length <= MAX_EVENT_SIZE);

    if (validEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events provided' });
    }

    // 4. Update storage
    const pipeline = redis.pipeline();
    pipeline.rpush(keys.events, ...validEvents);
    pipeline.ltrim(keys.events, -MAX_STORED_EVENTS, -1);
    pipeline.expire(keys.events, ttlSeconds);

    // Update lastSeenAt in meta
    meta.lastSeenAt = Date.now();
    pipeline.set(keys.meta, meta, { ex: ttlSeconds });
    pipeline.expire(keys.writeKeyHash, ttlSeconds);

    await pipeline.exec();

    return res.status(202).json({ accepted: validEvents.length });
  } catch (error) {
    console.error('Error ingesting events:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
