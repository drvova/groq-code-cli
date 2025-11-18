import {MCPClient, MCPTool, MCPToolResult} from './mcp-client.js';
import {ConfigManager, MCPServerConfig} from '../utils/local-settings.js';

export interface MCPServerStatus {
	name: string;
	connected: boolean;
	disabled: boolean;
	toolCount: number;
	error?: string;
}

export class MCPManager {
	private static instance: MCPManager;
	private clients: Map<string, MCPClient> = new Map();
	private configManager: ConfigManager;
	private initializationErrors: Map<string, string> = new Map();

	private constructor() {
		this.configManager = new ConfigManager();
	}

	public static getInstance(): MCPManager {
		if (!MCPManager.instance) {
			MCPManager.instance = new MCPManager();
		}
		return MCPManager.instance;
	}

	async initializeServers(): Promise<void> {
		const serverConfigs = this.configManager.getMCPServers();

		for (const [serverName, config] of Object.entries(serverConfigs)) {
			if (config.disabled) {
				continue;
			}

			try {
				await this.startServer(serverName, config);
			} catch (error) {
				this.initializationErrors.set(
					serverName,
					error instanceof Error ? error.message : String(error),
				);
			}
		}
	}

	async startServer(
		serverName: string,
		config?: MCPServerConfig,
	): Promise<void> {
		if (!config) {
			const configs = this.configManager.getMCPServers();
			config = configs[serverName];
			if (!config) {
				throw new Error(`MCP server '${serverName}' not found in configuration`);
			}
		}

		if (this.clients.has(serverName)) {
			const client = this.clients.get(serverName)!;
			if (client.isServerConnected()) {
				return;
			}
			await client.disconnect();
		}

		const client = new MCPClient(serverName, config);
		await client.connect();
		this.clients.set(serverName, client);
		this.initializationErrors.delete(serverName);
	}

	async stopServer(serverName: string): Promise<void> {
		const client = this.clients.get(serverName);
		if (client) {
			await client.disconnect();
			this.clients.delete(serverName);
		}
	}

	async restartServer(serverName: string): Promise<void> {
		const client = this.clients.get(serverName);
		if (!client) {
			throw new Error(`MCP server '${serverName}' is not running`);
		}
		await client.restart();
	}

	async stopAllServers(): Promise<void> {
		const disconnectPromises = Array.from(this.clients.values()).map(client =>
			client.disconnect().catch(error => {
				console.error(
					`Error disconnecting server ${client.getServerName()}:`,
					error,
				);
			}),
		);
		await Promise.all(disconnectPromises);
		this.clients.clear();
	}

	getAllTools(): Array<{
		name: string;
		description?: string;
		inputSchema: Record<string, any>;
		serverName: string;
		prefixedName: string;
	}> {
		const allTools: Array<{
			name: string;
			description?: string;
			inputSchema: Record<string, any>;
			serverName: string;
			prefixedName: string;
		}> = [];

		for (const [serverName, client] of this.clients.entries()) {
			if (!client.isServerConnected()) {
				continue;
			}

			const tools = client.getTools();
			const prefix = client.getToolPrefix();

			for (const tool of tools) {
				const prefixedName = prefix ? `${prefix}:${tool.name}` : tool.name;

				allTools.push({
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema,
					serverName,
					prefixedName,
				});
			}
		}

		return allTools;
	}

	async callTool(
		prefixedToolName: string,
		args: any,
	): Promise<MCPToolResult> {
		for (const [serverName, client] of this.clients.entries()) {
			if (!client.isServerConnected()) {
				continue;
			}

			const tools = client.getTools();
			const prefix = client.getToolPrefix();

			for (const tool of tools) {
				const toolPrefixedName = prefix
					? `${prefix}:${tool.name}`
					: tool.name;

				if (toolPrefixedName === prefixedToolName) {
					try {
						return await client.callTool(tool.name, args);
					} catch (error) {
						if (
							error instanceof Error &&
							error.message.includes('not connected')
						) {
							await this.restartServer(serverName);
							return await client.callTool(tool.name, args);
						}
						throw error;
					}
				}
			}
		}

		throw new Error(`MCP tool '${prefixedToolName}' not found`);
	}

	getServerStatus(): MCPServerStatus[] {
		const configs = this.configManager.getMCPServers();
		const statuses: MCPServerStatus[] = [];

		for (const [serverName, config] of Object.entries(configs)) {
			const client = this.clients.get(serverName);
			const error = this.initializationErrors.get(serverName);

			statuses.push({
				name: serverName,
				connected: client?.isServerConnected() ?? false,
				disabled: config.disabled ?? false,
				toolCount: client?.getTools().length ?? 0,
				error,
			});
		}

		return statuses;
	}

	hasServer(serverName: string): boolean {
		const configs = this.configManager.getMCPServers();
		return serverName in configs;
	}
}
