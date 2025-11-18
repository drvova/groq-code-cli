import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {
	fetchOpenAICompatibleModels,
	ModelInfo,
} from '../../../utils/models-api.js';
import {ConfigManager} from '../../../utils/local-settings.js';

interface ModelSelectorProps {
	onSubmit: (model: string) => void;
	onCancel: () => void;
	currentModel?: string;
}

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

const VISIBLE_ITEM_COUNT = 10;

export default function ModelSelector({
	onSubmit,
	onCancel,
	currentModel,
}: ModelSelectorProps) {
	const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		const loadModels = async () => {
			const configManager = new ConfigManager();
			const selectedProvider = configManager.getSelectedProvider();
			let cachedModels = configManager.getCachedModels();

			if (cachedModels) {
				const filteredModels = selectedProvider
					? cachedModels.filter(m => m.providerId === selectedProvider)
					: cachedModels;
				setModels(filteredModels.length > 0 ? filteredModels : FALLBACK_MODELS);
				setLoading(false);
				updateSelectedIndex(
					filteredModels.length > 0 ? filteredModels : FALLBACK_MODELS,
				);
				return;
			}

			try {
				const fetchedModels = await fetchOpenAICompatibleModels();
				if (fetchedModels.length > 0) {
					const filteredModels = selectedProvider
						? fetchedModels.filter(m => m.providerId === selectedProvider)
						: fetchedModels;
					setModels(
						filteredModels.length > 0 ? filteredModels : FALLBACK_MODELS,
					);
					configManager.setCachedModels(fetchedModels);
					updateSelectedIndex(
						filteredModels.length > 0 ? filteredModels : FALLBACK_MODELS,
					);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch models');
			} finally {
				setLoading(false);
			}
		};

		const updateSelectedIndex = (modelList: ModelInfo[]) => {
			const currentIndex = modelList.findIndex(m => m.id === currentModel);
			setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
		};

		loadModels();
	}, [currentModel]);

	useInput((input, key) => {
		if (loading) return;

		if (key.return) {
			onSubmit(models[selectedIndex].id);
			return;
		}

		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(models.length - 1, prev + 1));
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column">
				<Text color="cyan">Loading models...</Text>
			</Box>
		);
	}

	// Calculate visible window
	const halfVisible = Math.floor(VISIBLE_ITEM_COUNT / 2);
	const startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(models.length, startIndex + VISIBLE_ITEM_COUNT);
	const adjustedStart = Math.max(0, endIndex - VISIBLE_ITEM_COUNT);
	const visibleModels = models.slice(adjustedStart, endIndex);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					Select Model ({selectedIndex + 1}/{models.length})
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="yellow">⚠ {error} (using fallback models)</Text>
				</Box>
			)}

			<Box flexDirection="column">
				{visibleModels.map((model, index) => {
					const actualIndex = adjustedStart + index;
					return (
						<Box key={model.id}>
							<Text
								color={actualIndex === selectedIndex ? 'black' : 'white'}
								backgroundColor={
									actualIndex === selectedIndex ? 'cyan' : undefined
								}
								bold={actualIndex === selectedIndex}
							>
								{actualIndex === selectedIndex ? '>' : ' '} {model.name}
								{model.id === currentModel ? ' [current]' : ''}
							</Text>
						</Box>
					);
				})}
			</Box>

			{models.length > VISIBLE_ITEM_COUNT && (
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						↑/↓ to scroll
					</Text>
				</Box>
			)}
		</Box>
	);
}
