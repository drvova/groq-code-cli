/**
 * Configuration Context - Singleton for global configuration access
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for configuration
 * Constitutional compliance: AMENDMENT V - Long-term architecture with proper DI
 */

import {ConfigManager} from '../../utils/local-settings.js';

/**
 * ConfigContext provides a singleton instance of ConfigManager
 * This eliminates the need to create new ConfigManager() instances across the codebase
 */
export class ConfigContext {
	private static instance: ConfigContext | null = null;
	private configManager: ConfigManager;

	private constructor() {
		this.configManager = new ConfigManager();
	}

	/**
	 * Get the singleton instance of ConfigContext
	 */
	static getInstance(): ConfigContext {
		if (!ConfigContext.instance) {
			ConfigContext.instance = new ConfigContext();
		}
		return ConfigContext.instance;
	}

	/**
	 * Get the underlying ConfigManager instance
	 */
	getConfigManager(): ConfigManager {
		return this.configManager;
	}

	/**
	 * Reset the singleton (useful for testing)
	 */
	static reset(): void {
		ConfigContext.instance = null;
	}

	// Convenience methods that delegate to ConfigManager

	getApiKey(): string | null {
		return this.configManager.getApiKey();
	}

	setApiKey(apiKey: string): void {
		this.configManager.setApiKey(apiKey);
	}

	clearApiKey(): void {
		this.configManager.clearApiKey();
	}

	getDefaultModel(): string | null {
		return this.configManager.getDefaultModel();
	}

	setDefaultModel(model: string): void {
		this.configManager.setDefaultModel(model);
	}

	getSelectedProvider(): string | null {
		return this.configManager.getSelectedProvider();
	}

	setSelectedProvider(provider: string): void {
		this.configManager.setSelectedProvider(provider);
	}

	getProviderApiKey(provider: string): string | null {
		return this.configManager.getProviderApiKey(provider);
	}

	setProviderApiKey(provider: string, apiKey: string): void {
		this.configManager.setProviderApiKey(provider, apiKey);
	}
}

/**
 * Helper function to get the config instance
 * This provides a clean API: getConfig().getDefaultModel()
 */
export function getConfig(): ConfigContext {
	return ConfigContext.getInstance();
}
