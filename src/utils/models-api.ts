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

interface ModelsDevAPI {
  [providerId: string]: {
    id: string;
    npm: string;
    name: string;
    models: {
      [modelId: string]: {
        id: string;
        name: string;
        modalities?: { input?: string[] };
        tool_call?: boolean;
        limit?: { context?: number };
      };
    };
  };
}

export async function fetchOpenAICompatibleModels(): Promise<ModelInfo[]> {
  return new Promise((resolve, reject) => {
    https.get('https://models.dev/api.json', (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch models.dev API: HTTP ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const apiData: ModelsDevAPI = JSON.parse(data);
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

          resolve(models);
        } catch (err) {
          reject(new Error(`Failed to parse models.dev API: ${err}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Network error fetching models.dev: ${err.message}`));
    });
  });
}
