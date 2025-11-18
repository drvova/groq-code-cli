/**
 * Provider Factory - Creates appropriate LLM provider based on type
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for provider creation
 */

import {LLMProvider, ProviderConfig} from './base.js';
import {GroqProvider} from './groq-provider.js';
import {OpenAIProvider} from './openai-provider.js';
import {fetchProviders, ProviderInfo} from '../../utils/models-api.js';

export type ProviderType = 'groq' | 'openai' | string;

export class ProviderFactory {
	private static providerCache = new Map<string, ProviderInfo>();

	/**
	 * Create a provider instance based on type
	 */
	static async create(
		providerType: ProviderType,
		config: ProviderConfig,
	): Promise<LLMProvider> {
		// Groq is the default/primary provider
		if (providerType === 'groq') {
			return new GroqProvider(config);
		}

		// OpenAI provider
		if (providerType === 'openai') {
			return new OpenAIProvider(config, 'openai');
		}

		// Other OpenAI-compatible providers (Ollama, LMStudio, etc.)
		const providerInfo = await this.getProviderInfo(providerType);

		if (!providerInfo.apiBaseUrl) {
			throw new Error(
				`Provider ${providerType} does not have an API base URL configured.`,
			);
		}

		const enhancedConfig: ProviderConfig = {
			...config,
			baseUrl: providerInfo.apiBaseUrl,
		};

		return new OpenAIProvider(enhancedConfig, providerType);
	}

	/**
	 * Get provider information from API or cache
	 */
	private static async getProviderInfo(
		providerType: string,
	): Promise<ProviderInfo> {
		// Check cache first
		if (this.providerCache.has(providerType)) {
			return this.providerCache.get(providerType)!;
		}

		// Fetch from API
		const providers = await fetchProviders();
		const provider = providers.find(p => p.id === providerType);

		if (!provider) {
			throw new Error(
				`Unknown provider: ${providerType}. Please check provider configuration.`,
			);
		}

		// Cache for future use
		this.providerCache.set(providerType, provider);

		return provider;
	}

	/**
	 * Clear provider info cache (useful for testing or refresh)
	 */
	static clearCache(): void {
		this.providerCache.clear();
	}

	/**
	 * Check if a provider type is supported
	 */
	static async isSupported(providerType: string): Promise<boolean> {
		if (providerType === 'groq' || providerType === 'openai') {
			return true;
		}

		try {
			await this.getProviderInfo(providerType);
			return true;
		} catch {
			return false;
		}
	}
}
