import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const VERCEL_CLI_PATH = require.resolve('vercel/dist/vc.js');

const runVercelCli = (args, options = {}) =>
  spawnSync(process.execPath, [VERCEL_CLI_PATH, ...args], {
    shell: false,
    ...options,
  });

/**
 * Defines the project-specific MCP server for Lunch Buddy.
 * The server provides tools to manage diagnostics infrastructure on Vercel.
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

const textResult = text => ({ content: [{ type: 'text', text }] });

const addEnvVar = (key, val) => {
  try {
    const { status, stderr, error } = runVercelCli(
      ['env', 'add', key, 'production', val],
      { stdio: 'pipe', encoding: 'utf-8' }
    );

    if (error) {
      throw error;
    }
    if (status !== 0) {
      throw new Error(stderr || 'Unknown error');
    }

    return `Added ${key} to production`;
  } catch {
    return `Note: Could not add ${key} (it might already exist). Use 'vercel env rm ${key}' first if you need to update it.`;
  }
};

const handleSetupDiagnosticsEnv = args => {
  const upstashUrl = args?.['upstashUrl'];
  const upstashToken = args?.['upstashToken'];
  const secret = args?.['secret'] || randomBytes(32).toString('hex');

  const envs = [
    ['UPSTASH_REDIS_REST_URL', upstashUrl],
    ['UPSTASH_REDIS_REST_TOKEN', upstashToken],
    ['DIAGNOSTICS_WRITE_SECRET', secret],
  ];

  const results = envs.map(([key, val]) => addEnvVar(key, val));

  return textResult(
    `Diagnostics setup initiated:\n${results.join('\n')}\n\nYour Diagnostic Secret is: ${secret}\nKeep this safe!`
  );
};

const handleGenerateDiagnosticsSecret = () => {
  return textResult(`Generated Secret: ${randomBytes(32).toString('hex')}`);
};

const handleListVercelEnv = () => {
  const { status, stdout, stderr, error } = runVercelCli(
    ['env', 'ls', 'production'],
    { encoding: 'utf8' }
  );

  if (error) {
    throw error;
  }
  if (status !== 0) {
    throw new Error(stderr || 'Unknown error');
  }

  return textResult(stdout);
};

const handleTestUpstashConnection = async args => {
  const url = args?.['upstashUrl'];
  const token = args?.['upstashToken'];
  const resp = await globalThis.fetch(`${url}/get/test_connection`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  return textResult(
    `Status: ${resp.status}\nResponse: ${JSON.stringify(data)}`
  );
};

const toolHandlers = {
  setup_diagnostics_env: handleSetupDiagnosticsEnv,
  generate_diagnostics_secret: handleGenerateDiagnosticsSecret,
  list_vercel_env: handleListVercelEnv,
  test_upstash_connection: handleTestUpstashConnection,
};

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await handler(args);
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
