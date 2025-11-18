import https from 'https';

export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
	providerId: string;
	contextWindow: number;
	supportsTools: boolean;
	supportsVision: boolean;
}

export interface ProviderInfo {
	id: string;
	name: string;
	docUrl: string;
	apiBaseUrl?: string;
	envVars: string[];
	modelCount: number;
}

interface ModelsDevAPI {
	[providerId: string]: {
		id: string;
		npm: string;
		name: string;
		doc: string;
		api?: string;
		env: string[];
		models: {
			[modelId: string]: {
				id: string;
				name: string;
				modalities?: {input?: string[]};
				tool_call?: boolean;
				limit?: {context?: number};
			};
		};
	};
}

async function fetchModelsDevAPI(): Promise<ModelsDevAPI> {
	return new Promise((resolve, reject) => {
		https
			.get('https://models.dev/api.json', res => {
				let data = '';

				if (res.statusCode !== 200) {
					reject(
						new Error(`Failed to fetch models.dev API: HTTP ${res.statusCode}`),
					);
					return;
				}

				res.on('data', chunk => {
					data += chunk;
				});
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (err) {
						reject(new Error(`Failed to parse models.dev API: ${err}`));
					}
				});
			})
			.on('error', err => {
				reject(new Error(`Network error fetching models.dev: ${err.message}`));
			});
	});
}

export async function fetchProviders(): Promise<ProviderInfo[]> {
	const apiData = await fetchModelsDevAPI();
	const providers: ProviderInfo[] = [];

	for (const [providerId, provider] of Object.entries(apiData)) {
		if (provider.npm !== '@ai-sdk/openai-compatible') continue;

		providers.push({
			id: providerId,
			name: provider.name,
			docUrl: provider.doc,
			apiBaseUrl: provider.api,
			envVars: provider.env || [],
			modelCount: Object.keys(provider.models).length,
		});
	}

	return providers;
}

export async function fetchOpenAICompatibleModels(): Promise<ModelInfo[]> {
	const apiData = await fetchModelsDevAPI();
	const models: ModelInfo[] = [];

	for (const [providerId, provider] of Object.entries(apiData)) {
		if (provider.npm !== '@ai-sdk/openai-compatible') continue;

		for (const [_, model] of Object.entries(provider.models)) {
			models.push({
				id: model.id,
				name: model.name,
				provider: provider.name,
				providerId,
				contextWindow: model.limit?.context || 0,
				supportsTools: model.tool_call || false,
				supportsVision: model.modalities?.input?.includes('image') || false,
			});
		}
	}

	return models;
}
