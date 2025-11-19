/**
 * LSP Selector - Interactive menu for LSP server management
 * Constitutional compliance: AMENDMENT VIII - Comprehensive implementation
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {LSPDetector, LSPServerConfig} from '../../../core/lsp-detector.js';
import {LSPManager} from '../../../core/lsp-manager.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

interface LSPSelectorProps {
	onCancel: () => void;
	onServerSelected?: (server: LSPServerConfig) => void;
}

interface ServerListItem extends SelectorItem {
	name: string;
	config: LSPServerConfig;
	bundled: boolean;
	active: boolean;
	languages: string;
	extensions: string;
}

export default function LSPSelector({
	onCancel,
	onServerSelected,
}: LSPSelectorProps) {
	const [loading, setLoading] = useState(true);
	const [servers, setServers] = useState<ServerListItem[]>([]);
	const [activeServer, setActiveServer] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadServers();
	}, []);

	const loadServers = async () => {
		try {
			setLoading(true);
			setError(null);

			const manager = LSPManager.getInstance();
			const isRunning = manager.getIsRunning();
			const currentServer = manager.getDetectedServer();

			if (isRunning && currentServer) {
				setActiveServer(currentServer.name);
			}

			const result = await LSPDetector.detectAll();

			const serverItems: ServerListItem[] = result.available.map(server => ({
				id: server.command,
				name: server.name,
				label: server.name,
				config: server,
				bundled: server.version === 'bundled',
				active: isRunning && currentServer?.name === server.name,
				languages: server.languages.join(', '),
				extensions: server.fileExtensions.join(', '),
			}));

			// Sort: Active first, then bundled, then by priority
			serverItems.sort((a, b) => {
				if (a.active !== b.active) return a.active ? -1 : 1;
				if (a.bundled !== b.bundled) return a.bundled ? -1 : 1;
				return b.config.priority - a.config.priority;
			});

			setServers(serverItems);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleSelect = async (item: ServerListItem) => {
		try {
			const manager = LSPManager.getInstance();

			// If selecting a different server, restart
			if (activeServer !== item.name) {
				if (manager.getIsRunning()) {
					await manager.stop();
				}

				await manager.start({
					serverCommand: item.config.command,
					serverArgs: item.config.args,
				});

				setActiveServer(item.name);
			}

			if (onServerSelected) {
				onServerSelected(item.config);
			}

			onCancel();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const handleStop = async () => {
		try {
			const manager = LSPManager.getInstance();
			if (manager.getIsRunning()) {
				await manager.stop();
				setActiveServer(null);
				await loadServers();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const renderItem = (item: ServerListItem, isSelected: boolean) => {
		const statusSymbol = item.active ? '●' : '○';
		const statusColor = item.active ? 'green' : 'gray';
		const bundledTag = item.bundled ? ' [BUNDLED]' : '';
		const selectedSymbol = isSelected ? '❯ ' : '  ';

		return (
			<Box key={item.id}>
				<Text color={isSelected ? 'cyan' : 'white'}>
					{selectedSymbol}
					<Text color={statusColor}>{statusSymbol}</Text> {item.name}
					<Text color="yellow" dimColor>
						{bundledTag}
					</Text>
				</Text>
			</Box>
		);
	};

	const footer = (
		<Box flexDirection="column" marginTop={1}>
			<Box>
				<Text dimColor>
					<Text color="green">↑↓</Text> Navigate{' '}
					<Text color="green">Enter</Text> Select{' '}
					<Text color="green">S</Text> Stop{' '}
					<Text color="green">R</Text> Refresh{' '}
					<Text color="green">Esc</Text> Cancel
				</Text>
			</Box>
			{activeServer && (
				<Box marginTop={1}>
					<Text color="green">
						● Active: <Text bold>{activeServer}</Text>
					</Text>
				</Box>
			)}
			{error && (
				<Box marginTop={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text dimColor>
					Total servers: {servers.length} (
					{servers.filter(s => s.bundled).length} bundled)
				</Text>
			</Box>
		</Box>
	);

	return (
		<BaseSelector
			items={servers}
			onSelect={handleSelect}
			onCancel={onCancel}
			title="LSP Server Selector"
			renderItem={renderItem}
			loading={loading}
			error={error}
			emptyMessage="No LSP servers detected. Install language servers to enable diagnostics."
			footer={footer}
			actions={[
				{
					key: 's',
					onAction: () => handleStop(),
				},
				{
					key: 'S',
					onAction: () => handleStop(),
				},
				{
					key: 'r',
					onAction: () => loadServers(),
				},
				{
					key: 'R',
					onAction: () => loadServers(),
				},
			]}
		/>
	);
}
