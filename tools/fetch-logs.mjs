#!/usr/bin/env node

/**
 * Fetch and format diagnostics logs for a given supportCode.
 *
 * Usage:
 *   node tools/fetch-logs.mjs <supportCode>
 *
 * Requirements:
 *   DIAGNOSTICS_ADMIN_TOKEN and NEXT_PUBLIC_BASE_URL (or default to localhost)
 */

const supportCode = process.argv[2];
const adminToken = process.env['DIAGNOSTICS_ADMIN_TOKEN'];
const baseUrl = process.env['VERCEL_URL']
  ? `https://${process.env['VERCEL_URL']}`
  : 'http://localhost:3000';

if (!supportCode) {
  console.error('Error: Please provide a supportCode');
  console.log('Usage: node tools/fetch-logs.mjs <supportCode>');
  process.exit(1);
}

if (!adminToken) {
  console.error('Error: DIAGNOSTICS_ADMIN_TOKEN environment variable not set');
  process.exit(1);
}

const fetchHelper = globalThis.fetch;

console.log(`Fetching logs for [${supportCode}] from ${baseUrl}...`);

try {
  const resp = await fetchHelper(
    `${baseUrl}/api/diagnostics/session?supportCode=${supportCode}`,
    {
      headers: {
        'x-admin-token': adminToken,
      },
    }
  );

  if (!resp.ok) {
    const err = await resp.json();
    console.error(`Error ${resp.status}: ${err.error || resp.statusText}`);
    process.exit(1);
  }

  const { meta, events } = await resp.json();

  console.log('\n--- SESSION METADATA ---');
  console.log(`Support Code: ${meta.supportCode}`);
  console.log(`Session ID  : ${meta.sessionId}`);
  console.log(`Created     : ${new Date(meta.createdAt).toLocaleString()}`);
  console.log(`Last Seen   : ${new Date(meta.lastSeenAt).toLocaleString()}`);
  console.log(`App Version : ${meta.appVersion}`);
  console.log(`User Agent  : ${meta.userAgent}`);
  console.log('------------------------\n');

  console.log(`Found ${events.length} events:\n`);

  for (const val of events) {
    const event = JSON.parse(val);
    const time = new Date(event.timestamp).toLocaleTimeString();
    const levelStr = event.level.toUpperCase().padEnd(5);
    const areaStr = `[${event.area}]`.padEnd(12);

    console.log(`${time} ${levelStr} ${areaStr} ${event.message}`);
    if (event.details && Object.keys(event.details).length > 0) {
      console.log(
        '  Details:',
        JSON.stringify(event.details, null, 2).split('\n').join('\n  ')
      );
    }
    if (event.error) {
      console.log('  Error:', event.error.message);
      if (event.error.stack) {
        console.log(
          '  Stack:',
          event.error.stack.split('\n').slice(0, 3).join('\n         ') + '...'
        );
      }
    }
    console.log('');
  }
} catch (error) {
  console.error('Failed to fetch logs:', error);
  process.exit(1);
}
