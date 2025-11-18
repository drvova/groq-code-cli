import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {fetchProviders, ProviderInfo} from '../../../utils/models-api.js';
import {ConfigManager} from '../../../utils/local-settings.js';

interface ProviderSelectorProps {
	onSubmit: (providerId: string) => void;
	onCancel: () => void;
	currentProvider?: string;
}

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

const VISIBLE_ITEM_COUNT = 10;

export default function ProviderSelector({
	onSubmit,
	onCancel,
	currentProvider,
}: ProviderSelectorProps) {
	const [providers, setProviders] =
		useState<ProviderInfo[]>(FALLBACK_PROVIDERS);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		const loadProviders = async () => {
			const configManager = new ConfigManager();
			let cachedProviders = configManager.getCachedProviders();

			if (cachedProviders) {
				setProviders(cachedProviders);
				setLoading(false);
				updateSelectedIndex(cachedProviders);
				return;
			}

			try {
				const fetchedProviders = await fetchProviders();
				if (fetchedProviders.length > 0) {
					setProviders(fetchedProviders);
					configManager.setCachedProviders(fetchedProviders);
					updateSelectedIndex(fetchedProviders);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to fetch providers',
				);
			} finally {
				setLoading(false);
			}
		};

		const updateSelectedIndex = (providerList: ProviderInfo[]) => {
			const currentIndex = providerList.findIndex(
				p => p.id === currentProvider,
			);
			setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
		};

		loadProviders();
	}, [currentProvider]);

	useInput((input, key) => {
		if (loading) return;

		if (key.return) {
			onSubmit(providers[selectedIndex].id);
			return;
		}

		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(providers.length - 1, prev + 1));
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column">
				<Text color="cyan">Loading providers...</Text>
			</Box>
		);
	}

	// Calculate visible window
	const halfVisible = Math.floor(VISIBLE_ITEM_COUNT / 2);
	const startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(providers.length, startIndex + VISIBLE_ITEM_COUNT);
	const adjustedStart = Math.max(0, endIndex - VISIBLE_ITEM_COUNT);
	const visibleProviders = providers.slice(adjustedStart, endIndex);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					Select Provider ({selectedIndex + 1}/{providers.length})
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="yellow">⚠ {error} (using fallback providers)</Text>
				</Box>
			)}

			<Box flexDirection="column">
				{visibleProviders.map((provider, index) => {
					const actualIndex = adjustedStart + index;
					return (
						<Box key={provider.id}>
							<Text
								color={actualIndex === selectedIndex ? 'black' : 'white'}
								backgroundColor={
									actualIndex === selectedIndex ? 'cyan' : undefined
								}
								bold={actualIndex === selectedIndex}
							>
								{actualIndex === selectedIndex ? '>' : ' '} {provider.name} (
								{provider.modelCount} models)
								{provider.id === currentProvider ? ' [current]' : ''}
							</Text>
						</Box>
					);
				})}
			</Box>

			{providers.length > VISIBLE_ITEM_COUNT && (
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						↑/↓ to scroll
					</Text>
				</Box>
			)}
		</Box>
	);
}
