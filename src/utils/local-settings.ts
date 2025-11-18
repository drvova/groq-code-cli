import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {ModelInfo, ProviderInfo} from './models-api';

interface Config {
	groqApiKey?: string; // Legacy - migrated to providers
	providers?: {[providerId: string]: string}; // providerId -> API key
	selectedProvider?: string;
	defaultModel?: string;
	groqProxy?: string;
}

interface ProvidersCache {
	timestamp: number;
	providers: ProviderInfo[];
}

interface ModelsCache {
	timestamp: number;
	models: ModelInfo[];
}

const CONFIG_DIR = '.groq'; // In home directory
const CONFIG_FILE = 'local-settings.json';
const MODELS_CACHE_FILE = 'models-cache.json';
const PROVIDERS_CACHE_FILE = 'providers-cache.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ConfigManager {
	private configPath: string;
	private cacheDir: string;

	constructor() {
		const homeDir = os.homedir();
		this.cacheDir = path.join(homeDir, CONFIG_DIR);
		this.configPath = path.join(this.cacheDir, CONFIG_FILE);
	}

	private ensureConfigDir(): void {
		const configDir = path.dirname(this.configPath);
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, {recursive: true});
		}
	}

	private readConfig(): Config {
		try {
			if (!fs.existsSync(this.configPath)) {
				return {};
			}
			const configData = fs.readFileSync(this.configPath, 'utf8');
			return JSON.parse(configData);
		} catch (error) {
			console.warn('Failed to read config file:', error);
			return {};
		}
	}

	private writeConfig(config: Config): void {
		this.ensureConfigDir();
		fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
			mode: 0o600, // Read/write for owner only
		});
		// Ensure restrictive perms even if file already existed
		try {
			fs.chmodSync(this.configPath, 0o600);
		} catch {
			// noop (esp. on Windows where chmod may not be supported)
		}
	}

	public getApiKey(): string | null {
		const config = this.readConfig();
		return config.groqApiKey || null;
	}

	public setApiKey(apiKey: string): void {
		try {
			const config = this.readConfig();
			config.groqApiKey = apiKey;
			this.writeConfig(config);
		} catch (error) {
			throw new Error(`Failed to save API key: ${error}`);
		}
	}

	public clearApiKey(): void {
		try {
			const config = this.readConfig();
			delete config.groqApiKey;

			if (Object.keys(config).length === 0) {
				if (fs.existsSync(this.configPath)) {
					fs.unlinkSync(this.configPath);
				}
			} else {
				this.writeConfig(config);
			}
		} catch (error) {
			console.warn('Failed to clear API key:', error);
		}
	}

	public getDefaultModel(): string | null {
		const config = this.readConfig();
		return config.defaultModel || null;
	}

	public setDefaultModel(model: string): void {
		try {
			const config = this.readConfig();
			config.defaultModel = model;
			this.writeConfig(config);
		} catch (error) {
			throw new Error(`Failed to save default model: ${error}`);
		}
	}

	public getProxy(): string | null {
		const config = this.readConfig();
		return config.groqProxy || null;
	}

	public setProxy(proxy: string): void {
		try {
			// Validate proxy input
			const trimmed = proxy?.trim?.() ?? '';
			if (!trimmed) {
				throw new Error('Proxy must be a non-empty string');
			}

			// Validate URL format and protocol
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(trimmed);
			} catch {
				throw new Error(`Invalid proxy URL: ${trimmed}`);
			}

			const allowedProtocols = new Set([
				'http:',
				'https:',
				'socks:',
				'socks4:',
				'socks5:',
			]);
			if (!allowedProtocols.has(parsedUrl.protocol)) {
				throw new Error(`Unsupported proxy protocol: ${parsedUrl.protocol}`);
			}

			const config = this.readConfig();
			config.groqProxy = trimmed;
			this.writeConfig(config);
		} catch (error) {
			// Preserve original error via cause for better debugging
			throw new Error(
				`Failed to save proxy: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	public clearProxy(): void {
		try {
			const config = this.readConfig();
			delete config.groqProxy;

			if (Object.keys(config).length === 0) {
				if (fs.existsSync(this.configPath)) {
					fs.unlinkSync(this.configPath);
				}
			} else {
				this.writeConfig(config);
			}
		} catch (error) {
			console.warn('Failed to clear proxy:', error);
		}
	}

	public getCachedModels(): ModelInfo[] | null {
		const cachePath = path.join(this.cacheDir, MODELS_CACHE_FILE);
		try {
			if (!fs.existsSync(cachePath)) return null;
			const cacheData = fs.readFileSync(cachePath, 'utf8');
			const cache: ModelsCache = JSON.parse(cacheData);
			if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
			return cache.models;
		} catch {
			return null;
		}
	}

	public setCachedModels(models: ModelInfo[]): void {
		this.ensureConfigDir();
		const cachePath = path.join(this.cacheDir, MODELS_CACHE_FILE);
		const cache: ModelsCache = {timestamp: Date.now(), models};
		fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
	}

	public getCachedProviders(): ProviderInfo[] | null {
		const cachePath = path.join(this.cacheDir, PROVIDERS_CACHE_FILE);
		try {
			if (!fs.existsSync(cachePath)) return null;
			const cacheData = fs.readFileSync(cachePath, 'utf8');
			const cache: ProvidersCache = JSON.parse(cacheData);
			if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
			return cache.providers;
		} catch {
			return null;
		}
	}

	public setCachedProviders(providers: ProviderInfo[]): void {
		this.ensureConfigDir();
		const cachePath = path.join(this.cacheDir, PROVIDERS_CACHE_FILE);
		const cache: ProvidersCache = {timestamp: Date.now(), providers};
		fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
	}

	public getSelectedProvider(): string | null {
		const config = this.readConfig();
		return config.selectedProvider || null;
	}

	public setSelectedProvider(providerId: string): void {
		try {
			const config = this.readConfig();
			config.selectedProvider = providerId;
			this.writeConfig(config);
		} catch (error) {
			throw new Error(`Failed to save selected provider: ${error}`);
		}
	}

	public getProviderApiKey(providerId: string): string | null {
		const config = this.readConfig();

		// Migrate legacy groqApiKey to providers structure
		if (config.groqApiKey && !config.providers) {
			config.providers = {groq: config.groqApiKey};
			delete config.groqApiKey;
			this.writeConfig(config);
		}

		return config.providers?.[providerId] || null;
	}

	public setProviderApiKey(providerId: string, apiKey: string): void {
		try {
			const config = this.readConfig();

			// Migrate legacy groqApiKey if exists
			if (config.groqApiKey && !config.providers) {
				config.providers = {groq: config.groqApiKey};
				delete config.groqApiKey;
			}

			if (!config.providers) config.providers = {};
			config.providers[providerId] = apiKey;
			this.writeConfig(config);
		} catch (error) {
			throw new Error(`Failed to save provider API key: ${error}`);
		}
	}
}
