# Diagnostics & Troubleshooting

This document describes how to use the diagnostics system to troubleshoot user-reported issues.

## Overview

Lunch Buddy includes an opt-in diagnostics system that allows users to share technical logs when reporting issues. When a user enables diagnostic logging:

1. A unique **support code** is generated (e.g., `KNO2AS4J18`)
2. Logs are stored in Redis (Upstash) with a 7-day TTL
3. The user shares the support code when reporting an issue
4. Maintainers can fetch and analyze the logs

## User Flow

Users enable diagnostics via:

1. Dashboard → "Customise" button
2. Scroll to "Diagnostics" section
3. Toggle on "Enable diagnostic logging"
4. Note the support code displayed
5. Click "Send logs now" to flush buffered events

## Fetching Diagnostic Logs

### Prerequisites

Set these environment variables (available in `.env` for local use):

```bash
export DIAGNOSTICS_ADMIN_TOKEN="<token-from-vercel>"
export VERCEL_URL="lunch-buddy.app"
```

The `DIAGNOSTICS_ADMIN_TOKEN` must also be configured in Vercel's environment variables for the API to accept requests.

### Using the fetch-logs tool

```bash
node tools/fetch-logs.mjs <supportCode>
```

Example output:

```
Fetching logs for [KNO2AS4J18] from https://lunch-buddy.app...

--- SESSION METADATA ---
Support Code: KNO2AS4J18
Session ID  : 334ce3f5-60a8-403d-981b-721a9e5a4dc3
Created     : 2/1/2026, 3:44:45 AM
Last Seen   : 2/1/2026, 3:45:46 AM
App Version : 1.11.8
User Agent  : Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
------------------------

Found 4 events:

3:44:45 AM INFO  [diagnostics] Diagnostic logging enabled
3:45:16 AM INFO  [push]        Ensuring permission
  Details: { "isSupported": true, "hasNotification": true, ... }
3:45:16 AM INFO  [push]        Current permission state
  Details: { "current": "default" }
3:45:17 AM INFO  [push]        Permission request result
  Details: { "result": "denied" }
```

### Direct Redis Query (Alternative)

If the fetch-logs tool isn't working, you can query Redis directly using the Upstash REST API:

```bash
# Fetch session metadata
curl -s "https://big-starling-61919.upstash.io/get/diag:<supportCode>:meta" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"

# Fetch events
curl -s "https://big-starling-61919.upstash.io/lrange/diag:<supportCode>:events/0/-1" \
  -H "Authorization: Bearer $KV_REST_API_TOKEN" | jq -r '.result[]' | jq -s '.'
```

## Common Diagnostic Scenarios

### Push Notification Issues

Look for events in the `push` area:

| Log Message                                            | What It Means                             |
| ------------------------------------------------------ | ----------------------------------------- |
| `Ensuring permission` with `isSupported: false`        | Browser doesn't support notifications     |
| `Current permission state` with `current: "denied"`    | Notifications blocked by browser/settings |
| `Permission request result` with `result: "denied"`    | User denied the permission prompt         |
| `Permission denied` with `reason: "denied-by-browser"` | Pre-blocked (e.g., Incognito mode)        |
| `Permission denied` with `reason: "denied-by-user"`    | User clicked "Block" on prompt            |

### API/Network Issues

Look for events in the `api` or `http` areas for request failures, timeouts, or unexpected responses.

### Service Worker Issues

Look for events in the `sw` or `background-sync` areas for issues with offline functionality or background notifications.

## Adding New Diagnostic Logging

When adding features that might need debugging, use the `DiagnosticsService`:

```typescript
import { DiagnosticsService } from '../../core/services/diagnostics.service';

@Injectable()
export class MyService {
  private readonly diagnostics = inject(DiagnosticsService);

  async doSomething(): Promise<void> {
    this.diagnostics.log('info', 'my-area', 'Starting operation', {
      relevantData: 'value',
    });

    try {
      // ... operation
      this.diagnostics.log('info', 'my-area', 'Operation succeeded');
    } catch (error) {
      this.diagnostics.log('error', 'my-area', 'Operation failed', {}, error);
    }
  }
}
```

**Guidelines:**

- Use descriptive `area` names (e.g., `push`, `api`, `auth`, `budget`)
- Include relevant context in `details` but avoid sensitive data
- The service automatically strips Authorization headers and redacts other sensitive fields (API keys, tokens, etc.)
- Use appropriate log levels: `info` for normal flow, `warn` for recoverable issues, `error` for failures

## Data Retention

- Diagnostic sessions expire after **7 days**
- Users can delete their logs at any time via the UI ("Disable & delete logs")
- No financial data is logged; only technical metadata
