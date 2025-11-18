import {
	validateReadBeforeEdit,
	getReadBeforeEditError,
} from '../tools/validators.js';
import {ToolRegistry, ToolSchema, initializeAllTools} from '../tools/index.js';
import {getConfig} from './config/index.js';
import {getProxyAgent, getProxyInfo} from '../utils/proxy-config.js';
import {MCPManager} from './mcp-manager.js';
import {LLMProvider, ProviderFactory, Message} from './providers/index.js';
import {debugLog, setDebugEnabled, generateCurlCommand} from '../utils/debug.js';
import {buildDefaultSystemMessage} from './prompts.js';
import fs from 'fs';
import path from 'path';

export class Agent {
	private provider: LLMProvider | null = null;
	private messages: Message[] = [];
	private apiKey: string | null = null;
	private model: string;
	private temperature: number;
	private sessionAutoApprove: boolean = false;
	private systemMessage: string;
	private proxyOverride?: string;
	private currentProvider: string = 'groq';
	private mcpManager: MCPManager;
	private mcpToolsLoaded: boolean = false;
	private onToolStart?: (name: string, args: Record<string, any>) => void;
	private onToolEnd?: (name: string, result: any) => void;
	private onToolApproval?: (
		toolName: string,
		toolArgs: Record<string, any>,
	) => Promise<{approved: boolean; autoApproveSession?: boolean}>;
	private onThinkingText?: (content: string, reasoning?: string) => void;
	private onFinalMessage?: (content: string, reasoning?: string) => void;
	private onMaxIterations?: (maxIterations: number) => Promise<boolean>;
	private onApiUsage?: (usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		total_time?: number;
	}) => void;
	private onError?: (error: string) => Promise<boolean>;
	private requestCount: number = 0;
	private currentAbortController: AbortController | null = null;
	private isInterrupted: boolean = false;

	private constructor(
		model: string,
		temperature: number,
		systemMessage: string | null,
		debug?: boolean,
		proxyOverride?: string,
	) {
		this.model = model;
		this.temperature = temperature;
		this.mcpManager = MCPManager.getInstance();
		this.proxyOverride = proxyOverride;

		initializeAllTools();
		setDebugEnabled(debug || false);

		this.systemMessage = systemMessage || buildDefaultSystemMessage(this.model);
		this.messages.push({role: 'system', content: this.systemMessage});

		this.loadContext();
	}

	private loadContext() {
		try {
			const explicitContextFile = process.env.GROQ_CONTEXT_FILE;
			const baseDir = process.env.GROQ_CONTEXT_DIR || process.cwd();
			const contextPath =
				explicitContextFile || path.join(baseDir, '.groq', 'context.md');
			const contextLimit = parseInt(
				process.env.GROQ_CONTEXT_LIMIT || '20000',
				10,
			);
			if (fs.existsSync(contextPath)) {
				const ctx = fs.readFileSync(contextPath, 'utf-8');
				const trimmed =
					ctx.length > contextLimit
						? ctx.slice(0, contextLimit) + '\n... [truncated]'
						: ctx;
				this.messages.push({
					role: 'system',
					content: `Project context loaded from ${
						explicitContextFile || '.groq/context.md'
					}. Use this as high-level reference when reasoning about the repository.\n\n${trimmed}`,
				});
			}
		} catch (error) {
			debugLog('Failed to load project context:', error);
		}
	}

	static async create(
		model: string,
		temperature: number,
		systemMessage: string | null,
		debug?: boolean,
		proxyOverride?: string,
	): Promise<Agent> {
		const defaultModel = getConfig().getDefaultModel();
		const selectedModel = defaultModel || model;

		return new Agent(
			selectedModel,
			temperature,
			systemMessage,
			debug,
			proxyOverride,
		);
	}

	public setToolCallbacks(callbacks: {
		onToolStart?: (name: string, args: Record<string, any>) => void;
		onToolEnd?: (name: string, result: any) => void;
		onToolApproval?: (
			toolName: string,
			toolArgs: Record<string, any>,
		) => Promise<{approved: boolean; autoApproveSession?: boolean}>;
		onThinkingText?: (content: string) => void;
		onFinalMessage?: (content: string) => void;
		onMaxIterations?: (maxIterations: number) => Promise<boolean>;
		onApiUsage?: (usage: {
			prompt_tokens: number;
			completion_tokens: number;
			total_tokens: number;
			total_time?: number;
		}) => void;
		onError?: (error: string) => Promise<boolean>;
	}) {
		Object.assign(this, callbacks);
	}

	public async setApiKey(apiKey: string): Promise<void> {
		debugLog('Setting API key in agent...');
		debugLog(
			'API key provided:',
			apiKey ? `${apiKey.substring(0, 8)}...` : 'empty',
		);
		this.apiKey = apiKey;

		// Get proxy configuration (with override if provided)
		const proxyAgent = getProxyAgent(this.proxyOverride);
		const proxyInfo = getProxyInfo(this.proxyOverride);

		if (proxyInfo.enabled) {
			debugLog(`Using ${proxyInfo.type} proxy: ${proxyInfo.url}`);
		}

		// Get selected provider
		this.currentProvider = getConfig().getSelectedProvider() || 'groq';

		// Create provider using factory
		this.provider = await ProviderFactory.create(this.currentProvider, {
			apiKey,
			proxyAgent,
		});

		debugLog(
			`Provider initialized: ${this.currentProvider}` +
				(proxyInfo.enabled ? ' with proxy' : ''),
		);
	}

	public async saveApiKey(apiKey: string): Promise<void> {
		getConfig().setApiKey(apiKey);
		await this.setApiKey(apiKey);
	}

	public clearApiKey(): void {
		getConfig().clearApiKey();
		this.apiKey = null;
		this.provider = null;
	}

	public clearHistory(): void {
		// Reset messages to only contain system messages
		this.messages = this.messages.filter(msg => msg.role === 'system');
	}

	public restoreMessages(messages: Message[]): void {
		// Keep only system messages
		const systemMessages = this.messages.filter(msg => msg.role === 'system');
		// Restore conversation history
		this.messages = [...systemMessages, ...messages];
	}

	private async loadMCPTools(): Promise<void> {
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

				// Create executor that calls MCP
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

	public getMessages(): Message[] {
		// Return non-system messages for session saving
		return this.messages.filter(msg => msg.role !== 'system');
	}

	public getCurrentContext(): {content: string; path: string} | null {
		try {
			const explicitContextFile = process.env.GROQ_CONTEXT_FILE;
			const baseDir = process.env.GROQ_CONTEXT_DIR || process.cwd();
			const contextPath =
				explicitContextFile || path.join(baseDir, '.groq', 'context.md');

			if (fs.existsSync(contextPath)) {
				const content = fs.readFileSync(contextPath, 'utf-8');
				return {content, path: contextPath};
			}
			return null;
		} catch (error) {
			return null;
		}
	}

	public restoreContext(contextContent: string, contextPath: string): void {
		// Remove old context message if exists
		this.messages = this.messages.filter(
			msg =>
				!(
					msg.role === 'system' &&
					msg.content.includes('Project context loaded')
				),
		);

		// Add restored context
		const contextLimit = parseInt(
			process.env.GROQ_CONTEXT_LIMIT || '20000',
			10,
		);
		const trimmed =
			contextContent.length > contextLimit
				? contextContent.slice(0, contextLimit) + '\n... [truncated]'
				: contextContent;

		this.messages.push({
			role: 'system',
			content: `Project context loaded from ${contextPath} (session snapshot). Use this as high-level reference when reasoning about the repository.\n\n${trimmed}`,
		});
	}

	public setModel(model: string): void {
		this.model = model;
		getConfig().setDefaultModel(model);
		this.systemMessage = buildDefaultSystemMessage(model);
		
		const systemMsgIndex = this.messages.findIndex(
			msg => msg.role === 'system' && msg.content.includes('coding assistant'),
		);
		if (systemMsgIndex >= 0) {
			this.messages[systemMsgIndex].content = this.systemMessage;
		}
	}

	public getCurrentModel(): string {
		return this.model;
	}

	public setSessionAutoApprove(enabled: boolean): void {
		this.sessionAutoApprove = enabled;
	}

	public interrupt(): void {
		debugLog('Interrupting current request');
		this.isInterrupted = true;

		if (this.currentAbortController) {
			debugLog('Aborting current API request');
			this.currentAbortController.abort();
		}

		// Add interruption message to conversation
		this.messages.push({
			role: 'system',
			content: 'User has interrupted the request.',
		});
	}

	async chat(userInput: string): Promise<void> {
		// Reset interrupt flag at the start of a new chat
		this.isInterrupted = false;

		// Load MCP tools if not already loaded
		await this.loadMCPTools();

		// Check API key on first message send
		if (!this.provider) {
			debugLog('Initializing provider...');
			// Try environment variable first
			const envApiKey = process.env.GROQ_API_KEY;
			if (envApiKey) {
				debugLog('Using API key from environment variable');
				await this.setApiKey(envApiKey);
			} else {
				// Try provider-specific config first
				debugLog(
					'Environment variable GROQ_API_KEY not found, checking config file',
				);
				const selectedProvider = getConfig().getSelectedProvider() || 'groq';
				const providerApiKey = getConfig().getProviderApiKey(selectedProvider);

				if (providerApiKey) {
					debugLog(
						`Using API key from config for provider: ${selectedProvider}`,
					);
					await this.setApiKey(providerApiKey);
				} else {
					// Fallback to legacy groqApiKey field
					const legacyApiKey = getConfig().getApiKey();
					if (legacyApiKey) {
						debugLog('Using API key from legacy groqApiKey field');
						await this.setApiKey(legacyApiKey);
					} else {
						debugLog('No API key found anywhere');
						throw new Error(
							'No API key available. Please use /login to set your API key.',
						);
					}
				}
			}
			debugLog('Provider initialized successfully');
		}

		// Add user message
		this.messages.push({role: 'user', content: userInput});

		const maxIterations = 50;
		let iteration = 0;

		while (true) {
			// Outer loop for iteration reset
			while (iteration < maxIterations) {
				// Check for interruption before each iteration
				if (this.isInterrupted) {
					debugLog('Chat loop interrupted by user');
					this.currentAbortController = null;
					return;
				}

				try {
					// Check provider exists
					if (!this.provider) {
						throw new Error('Provider not initialized');
					}

					debugLog('Making API call to Groq with model:', this.model);
					debugLog('Messages count:', this.messages.length);
					debugLog('Last few messages:', this.messages.slice(-3));

					// Prepare request body for curl logging
					const requestBody = {
						model: this.model,
						messages: this.messages,
						tools: ToolRegistry.getAllSchemas(),
						tool_choice: 'auto' as const,
						temperature: this.temperature,
						max_tokens: 8000,
						stream: false as const,
					};

					// Log equivalent curl command
					this.requestCount++;
					const curlCommand = generateCurlCommand(
						this.apiKey!,
						requestBody,
						this.requestCount,
					);
					if (curlCommand) {
						debugLog('Equivalent curl command:', curlCommand);
					}

					// Create AbortController for this request
					this.currentAbortController = new AbortController();

					// Use provider to stream response
					let message: any = null;
					let reasoning: string | undefined;
					let usage: any = null;

					for await (const chunk of this.provider.stream(this.messages, {
						model: this.model,
						temperature: this.temperature,
						tools: ToolRegistry.getAllSchemas(),
						maxTokens: 8000,
						signal: this.currentAbortController.signal,
					})) {
						if (chunk.finish_reason === 'usage') {
							// Extract usage data from chunk
							usage = chunk;
						} else {
							// This is the main response chunk
							message = {
								content: chunk.content,
								tool_calls: chunk.tool_calls,
							};
							reasoning = chunk.reasoning;
						}
					}

					if (!message) {
						throw new Error('No response received from provider');
					}

					debugLog('Provider response received');
					debugLog('Message content length:', message.content?.length || 0);
					debugLog('Message has tool_calls:', !!message.tool_calls);
					debugLog(
						'Message tool_calls count:',
						message.tool_calls?.length || 0,
					);

					// Pass usage data to callback if available
					if (usage && this.onApiUsage) {
						this.onApiUsage({
							prompt_tokens: usage.prompt_tokens || 0,
							completion_tokens: usage.completion_tokens || 0,
							total_tokens: usage.total_tokens || 0,
							total_time: usage.total_time,
						});
					}

					// Handle tool calls if present
					if (message.tool_calls) {
						// Show thinking text or reasoning if present
						if (message.content || reasoning) {
							if (this.onThinkingText) {
								this.onThinkingText(message.content || '', reasoning);
							}
						}

						// Add assistant message to history
						const assistantMsg: Message = {
							role: 'assistant',
							content: message.content || '',
						};
						assistantMsg.tool_calls = message.tool_calls;
						this.messages.push(assistantMsg);

						// Execute tool calls
						for (const toolCall of message.tool_calls) {
							// Check for interruption before each tool execution
							if (this.isInterrupted) {
								debugLog('Tool execution interrupted by user');
								this.currentAbortController = null;
								return;
							}

							const result = await this.executeToolCall(toolCall);

							// Add tool result to conversation (including rejected ones)
							this.messages.push({
								role: 'tool',
								tool_call_id: toolCall.id,
								content: JSON.stringify(result),
							});

							// Check if user rejected the tool, if so, stop processing
							if (result.userRejected) {
								// Add a note to the conversation that the user rejected the tool
								this.messages.push({
									role: 'system',
									content: `The user rejected the ${toolCall.function.name} tool execution. The response has been terminated. Please wait for the user's next instruction.`,
								});
								return;
							}
						}

						// Continue loop to get model response to tool results
						iteration++;
						continue;
					}

					// No tool calls, this is the final response
					const content = message.content || '';
					debugLog('Final response - no tool calls detected');
					debugLog('Final content length:', content.length);

					if (this.onFinalMessage) {
						this.onFinalMessage(content, reasoning);
					}

					this.messages.push({role: 'assistant', content});
					this.currentAbortController = null;
					return;
				} catch (error) {
					const shouldContinue = await this.handleError(error);
					if (!shouldContinue) return;
					iteration++;
				}
			}

			if (iteration >= maxIterations) {
				const shouldContinue = this.onMaxIterations
					? await this.onMaxIterations(maxIterations)
					: false;
					
				if (shouldContinue) {
					iteration = 0;
					continue;
				}
				return;
			}
		}
	}

	private async handleError(error: unknown): Promise<boolean> {
		this.currentAbortController = null;

		if (
			error instanceof Error &&
			(error.message.includes('Request was aborted') ||
				error.name === 'AbortError')
		) {
			return false;
		}

		debugLog('Error occurred during API call:', error);

		let errorMessage = 'Unknown error occurred';
		let is401Error = false;

		if (error instanceof Error) {
			errorMessage = error.message;
			if ('status' in error) {
				const status = (error as any).status;
				errorMessage = `API Error (${status}): ${errorMessage}`;
				is401Error = status === 401;
			}
		} else {
			errorMessage = String(error);
		}

		if (is401Error) {
			throw new Error(
				`${errorMessage}. Please check your API key and use /login to set a valid key.`,
			);
		}

		if (this.onError) {
			const shouldRetry = await this.onError(errorMessage);
			if (shouldRetry) return true;
			
			this.messages.push({
				role: 'system',
				content: `Request failed with error: ${errorMessage}. User chose not to retry.`,
			});
			return false;
		}

		this.messages.push({
			role: 'system',
			content: `Previous API request failed with error: ${errorMessage}. Please try a different approach.`,
		});

		return true;
	}

	private async executeToolCall(toolCall: any): Promise<Record<string, any>> {
		try {
			const toolName = this.normalizeToolName(toolCall.function.name);
			const toolArgs = this.parseToolArgs(toolCall.function.arguments);

			if (!toolArgs.success) {
				return {error: toolArgs.error, success: false};
			}

			if (this.onToolStart) {
				this.onToolStart(toolName, toolArgs.args);
			}

			if (!this.validateToolUsage(toolName, toolArgs.args)) {
				const errorMessage = getReadBeforeEditError(toolArgs.args.file_path);
				const result = {error: errorMessage, success: false};
				if (this.onToolEnd) this.onToolEnd(toolName, result);
				return result;
			}

			const approval = await this.checkToolApproval(toolName, toolArgs.args);
			if (!approval.approved) {
				const result = {
					error: approval.isInterrupted
						? 'Tool execution interrupted by user'
						: 'Tool execution canceled by user',
					success: false,
					userRejected: true,
				};
				if (this.onToolEnd) this.onToolEnd(toolName, result);
				return result;
			}

			const result = await this.runTool(toolName, toolArgs.args);

			if (this.onToolEnd) {
				this.onToolEnd(toolName, result);
			}

			return result;
		} catch (error) {
			const errorMsg = `Tool execution error: ${error}`;
			return {error: errorMsg, success: false};
		}
	}

	private normalizeToolName(name: string): string {
		return name.startsWith('repo_browser.')
			? name.substring('repo_browser.'.length)
			: name;
	}

	private parseToolArgs(argsString: string): {success: boolean; args?: any; error?: string} {
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
	): Promise<{approved: boolean; isInterrupted?: boolean}> {
		const toolCategory = ToolRegistry.getToolCategory(toolName);
		const isDangerous = toolCategory === 'dangerous';
		const requiresApproval = toolCategory === 'approval_required';
		const needsApproval = isDangerous || requiresApproval;
		const canAutoApprove = requiresApproval && !isDangerous && this.sessionAutoApprove;

		if (!needsApproval || canAutoApprove) {
			return {approved: true};
		}

		if (this.onToolApproval) {
			if (this.isInterrupted) return {approved: false, isInterrupted: true};

			const result = await this.onToolApproval(toolName, args);

			if (this.isInterrupted) return {approved: false, isInterrupted: true};

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

// Remove old debug log functions as they are imported now
