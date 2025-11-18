import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import {
	fetchOpenAICompatibleModels,
	ModelInfo,
} from '../../../utils/models-api.js';
import {getConfig} from '../../../core/config/index.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

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
	const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [initialIndex, setInitialIndex] = useState(0);

	useEffect(() => {
		const loadModels = async () => {
			const configManager = getConfig().getConfigManager();
			const selectedProvider = configManager.getSelectedProvider();
			let cachedModels = configManager.getCachedModels();

			if (cachedModels) {
				processModels(cachedModels, selectedProvider);
				setLoading(false);
				return;
			}

			try {
				const fetchedModels = await fetchOpenAICompatibleModels();
				if (fetchedModels.length > 0) {
					configManager.setCachedModels(fetchedModels);
					processModels(fetchedModels, selectedProvider);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch models');
			} finally {
				setLoading(false);
			}
		};

		const processModels = (allModels: ModelInfo[], providerId: string | null) => {
			const filteredModels = providerId
				? allModels.filter(m => m.providerId === providerId)
				: allModels;
			
			const finalModels = filteredModels.length > 0 ? filteredModels : FALLBACK_MODELS;
			setModels(finalModels);
			
			const currentIndex = finalModels.findIndex(m => m.id === currentModel);
			setInitialIndex(currentIndex >= 0 ? currentIndex : 0);
		};

		loadModels();
	}, [currentModel]);

	const items: ModelItem[] = models.map(m => ({
		...m,
		label: m.name,
	}));

	return (
		<BaseSelector
			items={items}
			onSelect={(item) => onSubmit(item.id)}
			onCancel={onCancel}
			title="Select Model"
			initialSelectedIndex={initialIndex}
			loading={loading}
			error={error ? `${error} (using fallback models)` : null}
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
