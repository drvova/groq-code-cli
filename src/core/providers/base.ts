/**
 * Provider abstraction layer for LLM interactions
 * Constitutional compliance: AMENDMENT IV - Avoid Over-Abstraction
 * Purpose: Clean separation between Groq/OpenAI/future providers
 */

export interface Message {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: any[];
	tool_call_id?: string;
}

export interface StreamChunk {
	content?: string;
	tool_calls?: any[];
	reasoning?: string;
	finish_reason?: string;
}

export interface CompletionOptions {
	model: string;
	temperature: number;
	tools?: any[];
	maxTokens?: number;
	signal?: AbortSignal;
}

/**
 * Base interface for all LLM providers
 * Providers must implement streaming and optionally completion
 */
export interface LLMProvider {
	/**
	 * Stream responses from the LLM
	 * @param messages - Conversation history
	 * @param options - Model configuration
	 * @returns Async iterator of chunks
	 */
	stream(
		messages: Message[],
		options: CompletionOptions,
	): AsyncIterableIterator<StreamChunk>;

	/**
	 * Get provider name for identification
	 */
	getName(): string;

	/**
	 * Check if provider is properly initialized
	 */
	isReady(): boolean;
}

/**
 * Configuration for provider initialization
 */
export interface ProviderConfig {
	apiKey: string;
	proxyAgent?: any;
	baseUrl?: string;
	additionalHeaders?: Record<string, string>;
}
