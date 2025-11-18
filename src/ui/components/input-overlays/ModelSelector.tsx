import React, {useMemo} from 'react';
import {Text} from 'ink';
import {
	fetchOpenAICompatibleModels,
	ModelInfo,
} from '../../../utils/models-api.js';
import {getConfig} from '../../../core/config/index.js';
import {SelectorItem} from './BaseSelector.js';
import AsyncSelector from './AsyncSelector.js';

interface ModelSelectorProps {
	onSubmit: (model: string) => void;
	onCancel: () => void;
	currentModel?: string;
}

interface ModelItem extends SelectorItem, ModelInfo {}

const FALLBACK_MODELS: ModelInfo[] = [
	{
		id: 'moonshotai/kimi-k2-instruct-0905',
		name: 'Kimi K2 Instruct',
		provider: 'Moonshot AI',
		providerId: 'moonshotai',
		contextWindow: 128000,
		supportsTools: true,
		supportsVision: false,
	},
	{
		id: 'openai/gpt-oss-120b',
		name: 'GPT OSS 120B',
		provider: 'OpenAI',
		providerId: 'openai',
		contextWindow: 128000,
		supportsTools: true,
		supportsVision: false,
	},
	{
		id: 'openai/gpt-oss-20b',
		name: 'GPT OSS 20B',
		provider: 'OpenAI',
		providerId: 'openai',
		contextWindow: 128000,
		supportsTools: true,
		supportsVision: false,
	},
];

export default function ModelSelector({
	onSubmit,
	onCancel,
	currentModel,
}: ModelSelectorProps) {
	const configManager = getConfig().getConfigManager();
	const selectedProvider = configManager.getSelectedProvider();
	const cachedModels = configManager.getCachedModels();

	const mapModels = (models: ModelInfo[]) =>
		models.map(m => ({...m, label: m.name}));

	const filterModels = (models: ModelInfo[]) => {
		if (!selectedProvider) return models;
		return models.filter(m => m.providerId === selectedProvider);
	};

	const fallbackItems = useMemo(() => mapModels(FALLBACK_MODELS), []);

	const initialItems = useMemo(() => {
		if (!cachedModels) return undefined;
		const filtered = filterModels(cachedModels);
		return mapModels(filtered.length > 0 ? filtered : FALLBACK_MODELS);
	}, [cachedModels, selectedProvider]);

	return (
		<AsyncSelector
			items={initialItems}
			fetcher={async () => {
				const allModels = await fetchOpenAICompatibleModels();
				configManager.setCachedModels(allModels);
				const filtered = filterModels(allModels);
				return mapModels(filtered.length > 0 ? filtered : FALLBACK_MODELS);
			}}
			fallbackItems={fallbackItems}
			onSelect={item => onSubmit(item.id)}
			onCancel={onCancel}
			title="Select Model"
			currentItemId={currentModel}
			renderItem={(item, isSelected) => (
				<Text
					color={isSelected ? 'black' : 'white'}
					backgroundColor={isSelected ? 'cyan' : undefined}
					bold={isSelected}
				>
					{isSelected ? '>' : ' '} {item.label}
					{item.id === currentModel ? ' [current]' : ''}
				</Text>
			)}
		/>
	);
}
