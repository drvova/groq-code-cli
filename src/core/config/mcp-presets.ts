import {MCPServerConfig} from '../../utils/local-settings.js';

export interface PopularServer {
	id: string;
	type: 'stdio' | 'http';
	name: string;
	package?: string;
	command?: string;
	args?: string[];
	url?: string;
	prefix: string;
	requiresConfig?: string;
	description: string;
	label: string;
}

export const POPULAR_SERVERS: PopularServer[] = [
	{
		id: 'exa',
		type: 'stdio',
		name: 'Exa AI Search',
		package: 'mcp-remote',
		description: 'Advanced AI-powered web search and research',
		command: 'npx',
		args: ['-y', 'mcp-remote', 'https://mcp.exa.ai/mcp'],
		prefix: 'exa',
		requiresConfig: 'No API key required - connects to hosted service',
		label: 'Exa AI Search',
	},
	{
		id: 'brave',
		type: 'stdio',
		name: 'Brave Search',
		package: '@modelcontextprotocol/server-brave-search',
		description: 'Web search powered by Brave Search API',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-brave-search'],
		prefix: 'brave',
		requiresConfig: 'Requires BRAVE_API_KEY environment variable',
		label: 'Brave Search',
	},
	{
		id: 'fs',
		type: 'stdio',
		name: 'Filesystem',
		package: '@modelcontextprotocol/server-filesystem',
		description: 'Read and write files in allowed directories',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-filesystem'],
		prefix: 'fs',
		requiresConfig: 'Add directory path to args',
		label: 'Filesystem',
	},
	{
		id: 'github',
		type: 'stdio',
		name: 'GitHub',
		package: '@modelcontextprotocol/server-github',
		description: 'Interact with GitHub repositories and issues',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-github'],
		prefix: 'github',
		requiresConfig: 'Requires GITHUB_TOKEN environment variable',
		label: 'GitHub',
	},
	{
		id: 'postgres',
		type: 'stdio',
		name: 'PostgreSQL',
		package: '@modelcontextprotocol/server-postgres',
		description: 'Query and manage PostgreSQL databases',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-postgres'],
		prefix: 'pg',
		requiresConfig: 'Requires DATABASE_URL environment variable',
		label: 'PostgreSQL',
	},
	{
		id: 'sqlite',
		type: 'stdio',
		name: 'SQLite',
		package: '@modelcontextprotocol/server-sqlite',
		description: 'Query and manage SQLite databases',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-sqlite'],
		prefix: 'sqlite',
		requiresConfig: 'Add database path to args',
		label: 'SQLite',
	},
];
