import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

/**
 * Project-specific MCP Server for Lunch Buddy.
 * This server provides tools to manage the diagnostics infrastructure on Vercel.
 */

const server = new Server(
  {
    name: 'lunch-buddy-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'setup_diagnostics_env',
        description: 'Configure Vercel environment variables for diagnostics.',
        inputSchema: {
          type: 'object',
          properties: {
            upstashUrl: {
              type: 'string',
              description: 'The Upstash Redis REST URL',
            },
            upstashToken: {
              type: 'string',
              description: 'The Upstash Redis REST Token',
            },
            secret: {
              type: 'string',
              description:
                'Optional: The secret to use for hashing (DIAGNOSTICS_WRITE_SECRET). If not provided, one will be generated.',
            },
          },
          required: ['upstashUrl', 'upstashToken'],
        },
      },
      {
        name: 'generate_diagnostics_secret',
        description: 'Generate a new secure secret for diagnostics.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_vercel_env',
        description:
          'List current environment variables on Vercel (requires Vercel login).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'test_upstash_connection',
        description: 'Test connectivity to Upstash Redis.',
        inputSchema: {
          type: 'object',
          properties: {
            upstashUrl: { type: 'string' },
            upstashToken: { type: 'string' },
          },
          required: ['upstashUrl', 'upstashToken'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'setup_diagnostics_env': {
        const upstashUrl = args?.['upstashUrl'];
        const upstashToken = args?.['upstashToken'];
        const secret = args?.['secret'] || randomBytes(32).toString('hex');

        const results = [];
        const envs = [
          ['UPSTASH_REDIS_REST_URL', upstashUrl],
          ['UPSTASH_REDIS_REST_TOKEN', upstashToken],
          ['DIAGNOSTICS_WRITE_SECRET', secret],
        ];

        for (const [key, val] of envs) {
          try {
            // We use --force to overwrite if exists, or just add.
            // Vercel CLI 'env add' doesn't have an easy overwrite without interactive.
            // But we can try to add it.
            execSync(`npx vercel env add ${key} production "${val}"`, {
              stdio: 'pipe',
            });
            results.push(`Added ${key} to production`);
          } catch {
            results.push(
              `Note: Could not add ${key} (it might already exist). Use 'vercel env rm ${key}' first if you need to update it.`
            );
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `Diagnostics setup initiated:\n${results.join('\n')}\n\nYour Diagnostic Secret is: ${secret}\nKeep this safe!`,
            },
          ],
        };
      }

      case 'generate_diagnostics_secret': {
        const secret = randomBytes(32).toString('hex');
        return {
          content: [
            {
              type: 'text',
              text: `Generated Secret: ${secret}`,
            },
          ],
        };
      }

      case 'list_vercel_env': {
        const output = execSync('npx vercel env ls production', {
          encoding: 'utf8',
        });
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      case 'test_upstash_connection': {
        const url = args?.['upstashUrl'];
        const token = args?.['upstashToken'];
        const resp = await globalThis.fetch(`${url}/get/test_connection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        return {
          content: [
            {
              type: 'text',
              text: `Status: ${resp.status}\nResponse: ${JSON.stringify(data)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
