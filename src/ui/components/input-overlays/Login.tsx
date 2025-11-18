import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {ConfigManager} from '../../../utils/local-settings.js';
import {fetchProviders} from '../../../utils/models-api.js';

interface LoginProps {
	onSubmit: (apiKey: string) => void;
	onCancel: () => void;
}

export default function Login({onSubmit, onCancel}: LoginProps) {
	const [apiKey, setApiKey] = useState('');
	const [providerName, setProviderName] = useState('Groq');
	const [docUrl, setDocUrl] = useState('https://console.groq.com/keys');

	useEffect(() => {
		const loadProviderInfo = async () => {
			const configManager = new ConfigManager();
			const selectedProvider = configManager.getSelectedProvider();

			if (!selectedProvider) {
				// Default to Groq if no provider selected
				return;
			}

			// Try to get provider info from cache
			const cachedProviders = configManager.getCachedProviders();
			if (cachedProviders) {
				const provider = cachedProviders.find(p => p.id === selectedProvider);
				if (provider) {
					setProviderName(provider.name);
					setDocUrl(provider.docUrl);
					return;
				}
			}

			// Fetch from API if not in cache
			try {
				const providers = await fetchProviders();
				const provider = providers.find(p => p.id === selectedProvider);
				if (provider) {
					setProviderName(provider.name);
					setDocUrl(provider.docUrl);
				}
			} catch {
				// Fallback to generic message if fetch fails
				setProviderName(selectedProvider);
			}
		};

		loadProviderInfo();
	}, []);

	useInput((input, key) => {
		if (key.return) {
			if (apiKey.trim()) {
				onSubmit(apiKey.trim());
			}
			return;
		}

		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if (key.backspace || key.delete) {
			setApiKey(prev => prev.slice(0, -1));
			return;
		}

		if (input && !key.meta && !key.ctrl) {
			setApiKey(prev => prev + input);
		}
	});

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					Login with {providerName} API Key
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="gray">
					Enter your {providerName} API key to continue. Get one from{' '}
					<Text underline>{docUrl}</Text>
				</Text>
			</Box>

			<Box>
				<Text color="cyan">API Key: </Text>
				<Text>
					{'*'.repeat(Math.min(apiKey.length, 20))}
					{apiKey.length > 20 && '...'}
				</Text>
				<Text backgroundColor="cyan" color="cyan">
					▌
				</Text>
			</Box>
		</Box>
	);
}
