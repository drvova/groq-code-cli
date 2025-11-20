import {ToolRegistry, ToolSchema, initializeAllTools} from '../tools/index.js';
import {ToolStateManager} from './tool-state-manager.js';
import {MCPManager} from './mcp-manager.js';
import {validateReadBeforeEdit, getReadBeforeEditError} from '../tools/tools.js';
import {debugLog} from '../utils/debug.js';

export class ToolHandler {
	private mcpManager: MCPManager;
	private mcpToolsLoaded: boolean = false;
	private sessionAutoApprove: boolean = false;
	
	// Callbacks
	public onToolStart?: (name: string, args: Record<string, any>) => void;
	public onToolEnd?: (name: string, result: any) => void;
	public onToolApproval?: (
		toolName: string,
		toolArgs: Record<string, any>,
	) => Promise<{approved: boolean; autoApproveSession?: boolean}>;

	constructor() {
		this.mcpManager = MCPManager.getInstance();
		initializeAllTools();
		ToolStateManager.getInstance();
	}

	public async loadMCPTools(): Promise<void> {
		if (this.mcpToolsLoaded) return;

		try {
			await this.mcpManager.initializeServers();
			const mcpTools = this.mcpManager.getAllTools();

			for (const tool of mcpTools) {
				const toolSchema: ToolSchema = {
					type: 'function',
					function: {
						name: tool.prefixedName,
						description: tool.description || `MCP tool: ${tool.name}`,
						parameters: {
							type: 'object',
							properties: tool.inputSchema.properties || {},
							required: tool.inputSchema.required || [],
						},
					},
				};

				const executor = async (args: Record<string, any>) => {
					const mcpResult = await this.mcpManager.callTool(
						tool.prefixedName,
						args,
					);
					const textContent = mcpResult.content
						.filter(c => c.type === 'text')
						.map(c => c.text)
						.join('\n');

					return {
						success: !mcpResult.isError,
						output: textContent,
						error: mcpResult.isError ? textContent : undefined,
					};
				};

				ToolRegistry.registerTool(toolSchema, executor, 'approval_required');
			}

			this.mcpToolsLoaded = true;
			debugLog(`Loaded ${mcpTools.length} MCP tools`);
		} catch (error) {
			debugLog('Failed to load MCP tools:', error);
		}
	}

	public async refreshMCPTools(): Promise<void> {
		this.mcpToolsLoaded = false;
		await this.loadMCPTools();
	}

	public getEnabledTools(): ToolSchema[] {
		const stateManager = ToolStateManager.getInstance();
		const allSchemas = ToolRegistry.getAllSchemas();

		return allSchemas.filter(schema =>
			stateManager.isToolEnabled(schema.function.name),
		);
	}

	public setSessionAutoApprove(enabled: boolean): void {
		this.sessionAutoApprove = enabled;
	}

	public async executeToolCall(
		toolCall: any, 
		isInterrupted: boolean
	): Promise<{result: Record<string, any>, userRejected?: boolean}> {
		try {
			const toolName = this.normalizeToolName(toolCall.function.name);
			const toolArgs = this.parseToolArgs(toolCall.function.arguments);

			if (!toolArgs.success) {
				return {result: {error: toolArgs.error, success: false}};
			}

			if (this.onToolStart) {
				this.onToolStart(toolName, toolArgs.args);
			}

			if (!this.validateToolUsage(toolName, toolArgs.args)) {
				const errorMessage = getReadBeforeEditError(toolArgs.args.file_path);
				const result = {error: errorMessage, success: false};
				if (this.onToolEnd) this.onToolEnd(toolName, result);
				return {result};
			}

			const approval = await this.checkToolApproval(toolName, toolArgs.args, isInterrupted);
			if (!approval.approved) {
				const result = {
					error: approval.isInterrupted
						? 'Tool execution interrupted by user'
						: 'Tool execution canceled by user',
					success: false,
					userRejected: true,
				};
				if (this.onToolEnd) this.onToolEnd(toolName, result);
				return {result, userRejected: true};
			}

			const result = await this.runTool(toolName, toolArgs.args);

			if (this.onToolEnd) {
				this.onToolEnd(toolName, result);
			}

			return {result};
		} catch (error) {
			const errorMsg = `Tool execution error: ${error}`;
			return {result: {error: errorMsg, success: false}};
		}
	}

	private normalizeToolName(name: string): string {
		return name.startsWith('repo_browser.')
			? name.substring('repo_browser.'.length)
			: name;
	}

	private parseToolArgs(argsString: string): {
		success: boolean;
		args?: any;
		error?: string;
	} {
		try {
			return {success: true, args: JSON.parse(argsString)};
		} catch (error) {
			return {
				success: false,
				error: `Tool arguments truncated: ${error}. Please break this into smaller pieces or use shorter content.`,
			};
		}
	}

	private validateToolUsage(toolName: string, args: any): boolean {
		if (toolName === 'edit_file' && args.file_path) {
			return validateReadBeforeEdit(args.file_path);
		}
		return true;
	}

	private async checkToolApproval(
		toolName: string,
		args: any,
		isInterrupted: boolean
	): Promise<{approved: boolean; isInterrupted?: boolean}> {
		const toolCategory = ToolRegistry.getToolCategory(toolName);
		const isDangerous = toolCategory === 'dangerous';
		const requiresApproval = toolCategory === 'approval_required';
		const needsApproval = isDangerous || requiresApproval;
		const canAutoApprove =
			requiresApproval && !isDangerous && this.sessionAutoApprove;

		if (!needsApproval || canAutoApprove) {
			return {approved: true};
		}

		if (this.onToolApproval) {
			if (isInterrupted) return {approved: false, isInterrupted: true};

			const result = await this.onToolApproval(toolName, args);

			if (isInterrupted) return {approved: false, isInterrupted: true};

			if (result.autoApproveSession && requiresApproval && !isDangerous) {
				this.sessionAutoApprove = true;
			}

			return {approved: result.approved};
		}

		return {approved: false};
	}

	private async runTool(toolName: string, args: any): Promise<any> {
		const mcpTools = this.mcpManager.getAllTools();
		const isMCPTool = mcpTools.some(t => t.prefixedName === toolName);

		if (isMCPTool) {
			try {
				const mcpResult = await this.mcpManager.callTool(toolName, args);
				const textContent = mcpResult.content
					.filter(c => c.type === 'text')
					.map(c => c.text)
					.join('\n');

				return {
					success: !mcpResult.isError,
					output: textContent,
					error: mcpResult.isError ? textContent : undefined,
				};
			} catch (error) {
				return {
					success: false,
					error: `MCP tool error: ${
						error instanceof Error ? error.message : String(error)
					}`,
				};
			}
		}

		return await ToolRegistry.executeTool(toolName, args);
	}
}
