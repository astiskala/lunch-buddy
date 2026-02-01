import { VercelRequest, VercelResponse } from '@vercel/node';
import { redis, getSessionKeys, TTL } from '../_lib/redis';
import {
  hashWriteKey,
  generateSupportCode,
  generateOpaqueId,
  safeCompare,
} from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method;

  if (method === 'POST') {
    return createSession(req, res);
  } else if (method === 'GET') {
    return getSession(req, res);
  } else if (method === 'DELETE') {
    return deleteSession(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    const methodStr = method ?? 'UNKNOWN';
    return res.status(405).end(`Method ${methodStr} Not Allowed`);
  }
}

async function createSession(req: VercelRequest, res: VercelResponse) {
  try {
    const supportCode = generateSupportCode();
    const sessionId = generateOpaqueId();
    const writeKey = generateOpaqueId();
    const expiresAt = Date.now() + TTL * 1000;
    const hashedKey = await hashWriteKey(writeKey);

    const keys = getSessionKeys(supportCode);
    const body = req.body as { buildInfo?: { version?: string } } | undefined;
    const buildInfo = body?.buildInfo ?? {};

    const meta = {
      supportCode,
      sessionId,
      createdAt: Date.now(),
      expiresAt,
      userAgent: req.headers['user-agent'],
      appVersion: buildInfo.version,
      lastSeenAt: Date.now(),
    };

    // Store in Redis
    const pipeline = redis.pipeline();
    pipeline.set(keys.meta, meta, { ex: TTL });
    pipeline.set(keys.writeKeyHash, hashedKey, { ex: TTL });
    await pipeline.exec();

    return res.status(201).json({
      supportCode,
      sessionId,
      writeKey,
      expiresAt,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getSession(req: VercelRequest, res: VercelResponse) {
  const { supportCode } = req.query;
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env['DIAGNOSTICS_ADMIN_TOKEN'];

  if (!supportCode || typeof supportCode !== 'string') {
    return res.status(400).json({ error: 'Missing supportCode' });
  }

  if (
    !expectedToken ||
    typeof adminToken !== 'string' ||
    !safeCompare(adminToken, expectedToken)
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const keys = getSessionKeys(supportCode);
    const [meta, events] = await Promise.all([
      redis.get(keys.meta),
      redis.lrange(keys.events, 0, -1),
    ]);

    if (!meta) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      meta,
      events,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function deleteSession(req: VercelRequest, res: VercelResponse) {
  const { supportCode, writeKey } = req.body as {
    supportCode: string;
    writeKey?: string;
  };
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env['DIAGNOSTICS_ADMIN_TOKEN'];

  if (!supportCode) {
    return res.status(400).json({ error: 'Missing supportCode' });
  }

  const keys = getSessionKeys(supportCode);

  try {
    // Auth: either admin token or writeKey
    const isAdmin =
      expectedToken &&
      typeof adminToken === 'string' &&
      safeCompare(adminToken, expectedToken);

    if (!isAdmin) {
      if (!writeKey) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const storedHash = await redis.get<string>(keys.writeKeyHash);
      if (!storedHash) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const providedHash = await hashWriteKey(writeKey);
      if (!safeCompare(providedHash, storedHash)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Delete all keys
    const pipeline = redis.pipeline();
    pipeline.del(keys.meta);
    pipeline.del(keys.events);
    pipeline.del(keys.writeKeyHash);
    // Note: rate limit keys have different pattern, but they expire quickly anyway
    await pipeline.exec();

    return res.status(200).json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
