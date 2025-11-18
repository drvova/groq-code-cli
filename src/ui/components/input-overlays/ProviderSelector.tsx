import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import {fetchProviders, ProviderInfo} from '../../../utils/models-api.js';
import {getConfig} from '../../../core/config/index.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

interface ProviderSelectorProps {
	onSubmit: (providerId: string) => void;
	onCancel: () => void;
	currentProvider?: string;
}

interface ProviderItem extends SelectorItem, ProviderInfo {}

const FALLBACK_PROVIDERS: ProviderInfo[] = [
	{
		id: 'groq',
		name: 'Groq',
		docUrl: 'https://console.groq.com/keys',
		envVars: ['GROQ_API_KEY'],
		modelCount: 0,
	},
	{
		id: 'moonshotai',
		name: 'Moonshot AI',
		docUrl: 'https://platform.moonshot.cn',
		envVars: ['MOONSHOT_API_KEY'],
		modelCount: 0,
	},
];

export default function ProviderSelector({
	onSubmit,
	onCancel,
	currentProvider,
}: ProviderSelectorProps) {
	const [providers, setProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [initialIndex, setInitialIndex] = useState(0);

	useEffect(() => {
		const loadProviders = async () => {
			const configManager = getConfig().getConfigManager();
			let cachedProviders = configManager.getCachedProviders();

			if (cachedProviders) {
				updateState(cachedProviders);
				setLoading(false);
				return;
			}

			try {
				const fetchedProviders = await fetchProviders();
				if (fetchedProviders.length > 0) {
					configManager.setCachedProviders(fetchedProviders);
					updateState(fetchedProviders);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch providers');
			} finally {
				setLoading(false);
			}
		};

		const updateState = (list: ProviderInfo[]) => {
			setProviders(list);
			const currentIndex = list.findIndex(p => p.id === currentProvider);
			setInitialIndex(currentIndex >= 0 ? currentIndex : 0);
		};

		loadProviders();
	}, [currentProvider]);

	const items: ProviderItem[] = providers.map(p => ({
		...p,
		label: p.name,
	}));

	return (
		<BaseSelector
			items={items}
			onSelect={(item) => onSubmit(item.id)}
			onCancel={onCancel}
			title="Select Provider"
			initialSelectedIndex={initialIndex}
			loading={loading}
			error={error ? `${error} (using fallback providers)` : null}
			renderItem={(item, isSelected) => (
				<Text
					color={isSelected ? 'black' : 'white'}
					backgroundColor={isSelected ? 'cyan' : undefined}
					bold={isSelected}
				>
					{isSelected ? '>' : ' '} {item.label} ({item.modelCount} models)
					{item.id === currentProvider ? ' [current]' : ''}
				</Text>
			)}
		/>
	);
}
