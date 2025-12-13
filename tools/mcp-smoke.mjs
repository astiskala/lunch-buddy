#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['exec', '--', 'ng', 'mcp', '--local-only'],
    cwd: repoRoot,
    env: { NG_CLI_ANALYTICS: 'false' },
  });

  const client = new Client(
    { name: 'angular-mcp-smoke', version: '1.0.0' },
    { capabilities: { logging: { console: true } } }
  );

  await client.connect(transport);

  const tools = await client.listTools();
  const hasListProjects = tools.tools?.some(
    tool => tool.name === 'list_projects'
  );
  if (!hasListProjects) {
    throw new Error(
      'Angular MCP server did not register the list_projects tool.'
    );
  }

  const result = await client.callTool({ name: 'list_projects' });
  const workspaces = result.structuredContent?.workspaces ?? [];

  if (!Array.isArray(workspaces) || workspaces.length === 0) {
    throw new Error(
      'Angular MCP server could not find an Angular workspace from this root.'
    );
  }

  const projectNames = workspaces.flatMap(
    workspace => workspace.projects?.map(project => project.name) ?? []
  );

  console.log(
    `Angular MCP server is ready. Workspaces: ${workspaces.length}. Projects: ${
      projectNames.length > 0 ? projectNames.join(', ') : 'none'
    }.`
  );

  await client.close();
}

try {
  await main();
} catch (error) {
  console.error('Angular MCP smoke test failed:', error);
  process.exitCode = 1;
}
