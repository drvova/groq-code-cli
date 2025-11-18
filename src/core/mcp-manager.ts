import {MCPClient, MCPTool, MCPToolResult} from './mcp-client.js';
import {MCPServerConfig} from '../utils/local-settings.js';
import {getConfig} from './config/index.js';

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
	private initializationErrors: Map<string, string> = new Map();

	private constructor() {
		// No need to store config - using singleton via getConfig()
	}

	public static getInstance(): MCPManager {
		if (!MCPManager.instance) {
			MCPManager.instance = new MCPManager();
		}
		return MCPManager.instance;
	}

	async initializeServers(): Promise<void> {
		const serverConfigs = getConfig().getConfigManager().getMCPServers();

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
			const configs = getConfig().getConfigManager().getMCPServers();
			config = configs[serverName];
			if (!config) {
				throw new Error(
					`MCP server '${serverName}' not found in configuration`,
				);
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
		return Array.from(this.clients.entries())
			.filter(([_, client]) => client.isServerConnected())
			.flatMap(([serverName, client]) => {
				const prefix = client.getToolPrefix();
				return client.getTools().map(tool => ({
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema,
					serverName,
					prefixedName: prefix ? `${prefix}:${tool.name}` : tool.name,
				}));
			});
	}

	async callTool(prefixedToolName: string, args: any): Promise<MCPToolResult> {
		for (const [serverName, client] of this.clients.entries()) {
			if (!client.isServerConnected()) continue;

			const prefix = client.getToolPrefix();
			const toolName = prefix
				? prefixedToolName.replace(new RegExp(`^${prefix}:`), '')
				: prefixedToolName;

			// If prefix exists but wasn't in the name (and we removed nothing), skip
			if (prefix && toolName === prefixedToolName) continue;

			const tool = client.getTools().find(t => t.name === toolName);
			if (tool) {
				try {
					return await client.callTool(toolName, args);
				} catch (error) {
					if (
						error instanceof Error &&
						error.message.includes('not connected')
					) {
						await this.restartServer(serverName);
						return await client.callTool(toolName, args);
					}
					throw error;
				}
			}
		}

		throw new Error(`MCP tool '${prefixedToolName}' not found`);
	}

	getServerStatus(): MCPServerStatus[] {
		const configs = getConfig().getConfigManager().getMCPServers();
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
		const configs = getConfig().getConfigManager().getMCPServers();
		return serverName in configs;
	}
}
