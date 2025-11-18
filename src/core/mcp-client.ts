import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
	CallToolResultSchema,
	ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {MCPServerConfig} from '../utils/local-settings.js';

export interface MCPTool {
	name: string;
	description?: string;
	inputSchema: Record<string, any>;
}

export interface MCPToolResult {
	content: Array<{type: string; text: string}>;
	isError?: boolean;
}

export class MCPClient {
	private client: Client;
	private transport: StdioClientTransport;
	private serverName: string;
	private config: MCPServerConfig;
	private isConnected: boolean = false;
	private tools: MCPTool[] = [];

	constructor(serverName: string, config: MCPServerConfig) {
		this.serverName = serverName;
		this.config = config;
		this.client = new Client(
			{
				name: 'groq-code-cli',
				version: '1.0.2',
			},
			{
				capabilities: {},
			},
		);

		const envVars: Record<string, string> = {};
		if (config.env) {
			Object.entries(config.env).forEach(([key, value]) => {
				if (value !== undefined) {
					envVars[key] = value;
				}
			});
		}

		this.transport = new StdioClientTransport({
			command: config.command,
			args: config.args,
			env: Object.keys(envVars).length > 0 ? envVars : undefined,
		});
	}

	async connect(): Promise<void> {
		try {
			await this.client.connect(this.transport);
			this.isConnected = true;
			await this.discoverTools();
		} catch (error) {
			this.isConnected = false;
			throw new Error(
				`Failed to connect to MCP server '${this.serverName}': ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	async disconnect(): Promise<void> {
		try {
			if (this.isConnected) {
				await this.client.close();
				this.isConnected = false;
				this.tools = [];
			}
		} catch (error) {
			throw new Error(
				`Failed to disconnect from MCP server '${this.serverName}': ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	private async discoverTools(): Promise<void> {
		try {
			const result = await this.client.listTools();
			const validatedResult = ListToolsResultSchema.parse(result);

			this.tools = validatedResult.tools.map(tool => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema as Record<string, any>,
			}));
		} catch (error) {
			throw new Error(
				`Failed to discover tools from MCP server '${this.serverName}': ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	async callTool(toolName: string, args: any): Promise<MCPToolResult> {
		if (!this.isConnected) {
			throw new Error(
				`MCP server '${this.serverName}' is not connected. Call connect() first.`,
			);
		}

		try {
			const result = await this.client.callTool({
				name: toolName,
				arguments: args,
			});

			const validatedResult = CallToolResultSchema.parse(result);

			return {
				content: validatedResult.content as Array<{type: string; text: string}>,
				isError: validatedResult.isError,
			};
		} catch (error) {
			throw new Error(
				`Failed to call tool '${toolName}' on MCP server '${
					this.serverName
				}': ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	getTools(): MCPTool[] {
		return this.tools;
	}

	getServerName(): string {
		return this.serverName;
	}

	getToolPrefix(): string | undefined {
		return this.config.toolPrefix;
	}

	isServerConnected(): boolean {
		return this.isConnected;
	}

	async restart(): Promise<void> {
		await this.disconnect();
		await this.connect();
	}
}
