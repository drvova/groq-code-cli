/**
 * OpenAI-compatible LLM Provider Implementation
 * Supports OpenAI and any OpenAI-compatible API (Ollama, LMStudio, etc.)
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for OpenAI logic
 */

import OpenAI from 'openai';
import {
	LLMProvider,
	Message,
	StreamChunk,
	CompletionOptions,
	ProviderConfig,
} from './base.js';

export class OpenAIProvider implements LLMProvider {
	private client: OpenAI | null = null;
	private apiKey: string | null = null;
	private providerName: string;

	constructor(config: ProviderConfig, providerName: string = 'openai') {
		this.providerName = providerName;
		this.initialize(config);
	}

	private initialize(config: ProviderConfig): void {
		const clientOptions: any = {
			apiKey: config.apiKey,
		};

		if (config.baseUrl) {
			clientOptions.baseURL = config.baseUrl;
		}

		if (config.proxyAgent) {
			clientOptions.httpAgent = config.proxyAgent;
		}

		if (config.additionalHeaders) {
			clientOptions.defaultHeaders = config.additionalHeaders;
		}

		this.client = new OpenAI(clientOptions);
		this.apiKey = config.apiKey;
	}

	async *stream(
		messages: Message[],
		options: CompletionOptions,
	): AsyncIterableIterator<StreamChunk> {
		if (!this.client) {
			throw new Error(`${this.providerName} client not initialized`);
		}

		const response = await this.client.chat.completions.create(
			{
				model: options.model,
				messages: messages as any,
				tools: options.tools,
				tool_choice: 'auto',
				temperature: options.temperature,
				max_tokens: options.maxTokens || 8000,
				stream: false,
			},
			{
				signal: options.signal,
			},
		);

		// OpenAI non-streaming mode, yield single chunk
		const message = response.choices[0].message;
		const reasoning = (message as any).reasoning;

		yield {
			content: message.content || undefined,
			tool_calls: message.tool_calls,
			reasoning: reasoning,
			finish_reason: response.choices[0].finish_reason,
		};

		// Yield usage data
		if (response.usage) {
			yield {
				content: undefined,
				finish_reason: 'usage',
				...(response.usage as any),
			};
		}
	}

	getName(): string {
		return this.providerName;
	}

	isReady(): boolean {
		return this.client !== null && this.apiKey !== null;
	}

	/**
	 * Update API key and reinitialize client
	 */
	updateApiKey(apiKey: string, baseUrl?: string, proxyAgent?: any): void {
		this.initialize({apiKey, baseUrl, proxyAgent});
	}
}
