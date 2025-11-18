import React, {useMemo} from 'react';
import {Text} from 'ink';
import {fetchProviders, ProviderInfo} from '../../../utils/models-api.js';
import {getConfig} from '../../../core/config/index.js';
import {SelectorItem} from './BaseSelector.js';
import AsyncSelector from './AsyncSelector.js';

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
	const configManager = getConfig().getConfigManager();
	const cachedProviders = configManager.getCachedProviders();

	const fallbackItems = useMemo(
		() => FALLBACK_PROVIDERS.map(p => ({...p, label: p.name})),
		[],
	);

	const initialItems = useMemo(
		() => (cachedProviders ? cachedProviders.map(p => ({...p, label: p.name})) : undefined),
		[cachedProviders],
	);

	return (
		<AsyncSelector
			items={initialItems}
			fetcher={async () => {
				const providers = await fetchProviders();
				return providers.map(p => ({...p, label: p.name}));
			}}
			onLoadSuccess={(items) => configManager.setCachedProviders(items)}
			fallbackItems={fallbackItems}
			onSelect={item => onSubmit(item.id)}
			onCancel={onCancel}
			title="Select Provider"
			currentItemId={currentProvider}
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
