/**
 * Groq LLM Provider Implementation
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for Groq logic
 */

import Groq from 'groq-sdk';
import type {ClientOptions} from 'groq-sdk';
import {
	LLMProvider,
	Message,
	StreamChunk,
	CompletionOptions,
	ProviderConfig,
} from './base.js';

export class GroqProvider implements LLMProvider {
	private client: Groq | null = null;
	private apiKey: string | null = null;

	constructor(config: ProviderConfig) {
		this.initialize(config);
	}

	private initialize(config: ProviderConfig): void {
		const clientOptions: ClientOptions = {
			apiKey: config.apiKey,
		};

		if (config.proxyAgent) {
			clientOptions.httpAgent = config.proxyAgent;
		}

		this.client = new Groq(clientOptions);
		this.apiKey = config.apiKey;
	}

	async *stream(
		messages: Message[],
		options: CompletionOptions,
	): AsyncIterableIterator<StreamChunk> {
		if (!this.client) {
			throw new Error('Groq client not initialized');
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

		// Groq uses non-streaming mode, yield single chunk
		const message = response.choices[0].message;
		const reasoning = (message as any).reasoning;

		yield {
			content: message.content || undefined,
			tool_calls: message.tool_calls,
			reasoning: reasoning,
			finish_reason: response.choices[0].finish_reason,
		};

		// Yield usage data as metadata chunk
		if (response.usage) {
			yield {
				content: undefined,
				finish_reason: 'usage',
				// Store usage in a way the agent can extract it
				...(response.usage as any),
			};
		}
	}

	getName(): string {
		return 'groq';
	}

	isReady(): boolean {
		return this.client !== null && this.apiKey !== null;
	}

	/**
	 * Update API key and reinitialize client
	 */
	updateApiKey(apiKey: string, proxyAgent?: any): void {
		this.initialize({apiKey, proxyAgent});
	}
}
