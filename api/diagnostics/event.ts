import { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, getSessionKeys, TTL } from '../_lib/redis';
import { hashWriteKey } from '../_lib/utils';

const MAX_EVENTS_PER_REQ = 50;
const MAX_EVENT_SIZE = 8192; // 8KB
const RATE_LIMIT_PER_MIN = 60;
const MAX_STORED_EVENTS = 1000;

interface DiagnosticSessionMeta {
  supportCode: string;
  sessionId: string;
  appVersion?: string;
  userAgent?: string;
  createdAt: number;
  lastSeenAt: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    const methodStr = req.method ?? 'UNKNOWN';
    return res.status(405).end(`Method ${methodStr} Not Allowed`);
  }

  const { supportCode, writeKey, events } = req.body as {
    supportCode: string;
    writeKey: string;
    events: unknown[];
  };

  if (!supportCode || !writeKey || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const keys = getSessionKeys(supportCode);

  try {
    // 1. Validate writeKey
    const storedHash = await redis.get<string>(keys.writeKeyHash);
    if (!storedHash) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const providedHash = await hashWriteKey(writeKey);
    if (providedHash !== storedHash) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    // Update lastSeenAt in meta
    const meta = await redis.get<DiagnosticSessionMeta>(keys.meta);
    if (meta) {
      meta.lastSeenAt = Date.now();
      pipeline.set(keys.meta, meta, { ex: TTL });
    }

    await pipeline.exec();

    return res.status(202).json({ accepted: validEvents.length });
  } catch (error) {
    console.error('Error ingesting events:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
