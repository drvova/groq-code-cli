import {getConfig} from './config/index.js';
import {getProxyAgent, getProxyInfo} from '../utils/proxy-config.js';
import {LLMProvider, ProviderFactory, Message} from './providers/index.js';
import {
	debugLog,
	setDebugEnabled,
	generateCurlCommand,
} from '../utils/debug.js';
import {buildDefaultSystemMessage} from './prompts.js';
import {ContextManager} from './context-manager.js';
import {ToolHandler} from './tool-handler.js';

export class Agent {
	private provider: LLMProvider | null = null;
	private messages: Message[] = [];
	private apiKey: string | null = null;
	private model: string;
	private temperature: number;
	private systemMessage: string;
	private proxyOverride?: string;
	private currentProvider: string = 'groq';
	
	private contextManager: ContextManager;
	private toolHandler: ToolHandler;

	// Callbacks
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
		this.proxyOverride = proxyOverride;

		setDebugEnabled(debug || false);

		this.contextManager = new ContextManager();
		this.toolHandler = new ToolHandler();

		this.systemMessage = systemMessage || buildDefaultSystemMessage(this.model);
		this.messages.push({role: 'system', content: this.systemMessage});

		const contextMsg = this.contextManager.getFormattedContext();
		if (contextMsg) {
			this.messages.push({role: 'system', content: contextMsg});
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
		this.toolHandler.onToolStart = callbacks.onToolStart;
		this.toolHandler.onToolEnd = callbacks.onToolEnd;
		this.toolHandler.onToolApproval = callbacks.onToolApproval;
		
		this.onThinkingText = callbacks.onThinkingText;
		this.onFinalMessage = callbacks.onFinalMessage;
		this.onMaxIterations = callbacks.onMaxIterations;
		this.onApiUsage = callbacks.onApiUsage;
		this.onError = callbacks.onError;
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

	public async loadMCPTools(): Promise<void> {
		await this.toolHandler.loadMCPTools();
	}

	public async refreshMCPTools(): Promise<void> {
		await this.toolHandler.refreshMCPTools();
	}

	public getMessages(): Message[] {
		// Return non-system messages for session saving
		return this.messages.filter(msg => msg.role !== 'system');
	}

	public getCurrentContext(): {content: string; path: string} | null {
		return this.contextManager.getCurrentContext();
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

		const contextMsg = this.contextManager.restoreContext(contextContent, contextPath);
		this.messages.push({
			role: 'system',
			content: contextMsg,
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
		this.toolHandler.setSessionAutoApprove(enabled);
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
		await this.toolHandler.loadMCPTools();

		// Check API key on first message send
		if (!this.provider) {
			await this.initializeProvider();
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

					const tools = this.toolHandler.getEnabledTools();

					// Prepare request body for curl logging
					const requestBody = {
						model: this.model,
						messages: this.messages,
						tools,
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
						tools,
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

							const {result, userRejected} = await this.toolHandler.executeToolCall(toolCall, this.isInterrupted);

							// Add tool result to conversation (including rejected ones)
							this.messages.push({
								role: 'tool',
								tool_call_id: toolCall.id,
								content: JSON.stringify(result),
							});

							// Check if user rejected the tool, if so, stop processing
							if (userRejected) {
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

	private async initializeProvider(): Promise<void> {
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

		// Handle 429 Too Many Requests
		if (
			error instanceof Error &&
			'status' in error &&
			(error as any).status === 429
		) {
			errorMessage = `Rate limit exceeded (429). Please wait a moment before trying again.`;
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
}
