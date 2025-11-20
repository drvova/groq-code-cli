import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {MCPServerConfig} from '../../../utils/local-settings.js';
import {MCPManager} from '../../../core/mcp-manager.js';
import {getConfig} from '../../../core/config/index.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';
import MCPAddServer from './MCPAddServer.js';
import {POPULAR_SERVERS, PopularServer} from '../../../core/config/mcp-presets.js';

interface MCPSelectorProps {
	onCancel: () => void;
	onRefresh?: () => void;
}

interface ServerListItem extends SelectorItem {
	name: string;
	config: MCPServerConfig;
	connected: boolean;
	toolCount: number;
	error?: string;
}

type ViewMode = 'menu' | 'list' | 'add' | 'browse' | 'tools';

const MENU_ITEMS: SelectorItem[] = [
	{id: 'list', label: 'Manage existing servers'},
	{id: 'add', label: 'Add custom server'},
	{id: 'browse', label: 'Browse popular servers'},
];

export default function MCPSelector({onCancel, onRefresh}: MCPSelectorProps) {
	const [servers, setServers] = useState<ServerListItem[]>([]);
	const [mode, setMode] = useState<ViewMode>('menu');
	const [viewingServerTools, setViewingServerTools] = useState<string | null>(
		null,
	);

	const loadServers = async () => {
		const configManager = getConfig().getConfigManager();
		const mcpManager = MCPManager.getInstance();
		await mcpManager.initializeServers();
		const serverConfigs = configManager.getMCPServers();
		const statuses = mcpManager.getServerStatus();

		const serverList: ServerListItem[] = Object.entries(serverConfigs).map(
			([name, config]) => {
				const status = statuses.find(s => s.name === name);
				return {
					id: name,
					label: name,
					name,
					config,
					connected: status?.connected ?? false,
					toolCount: status?.toolCount ?? 0,
					error: status?.error,
				};
			},
		);
		setServers(serverList);
	};

	useEffect(() => {
		loadServers();
	}, []);

	if (mode === 'add') {
		return (
			<MCPAddServer
				onCancel={() => setMode('menu')}
				onSave={() => {
					setMode('list');
					loadServers();
					if (onRefresh) onRefresh();
				}}
			/>
		);
	}

	if (mode === 'browse') {
		return (
			<BaseSelector
				items={POPULAR_SERVERS}
				onSelect={server => {
					const configManager = getConfig().getConfigManager();
					const mcpManager = MCPManager.getInstance();
					const serverName =
						server.prefix || server.name.toLowerCase().replace(/\s+/g, '-');

					const serverConfig: MCPServerConfig =
						server.type === 'http'
							? {
									type: 'http',
									url: server.url!,
									toolPrefix: server.prefix,
							  }
							: {
									type: 'stdio',
									command: server.command!,
									args: server.args!,
									toolPrefix: server.prefix,
							  };

					configManager.setMCPServer(serverName, serverConfig);
					mcpManager.startServer(serverName, serverConfig).catch(() => {});
					setMode('list');
					loadServers();
					if (onRefresh) onRefresh();
				}}
				onCancel={() => setMode('menu')}
				title="Popular MCP Servers"
				renderItem={(item, isSelected) => {
					const server = item as PopularServer;
					return (
						<Box flexDirection="column" marginBottom={1}>
							<Text>
								{isSelected ? (
									<Text color="cyan" bold>
										→ {server.name}
										<Text dimColor> [{server.type.toUpperCase()}]</Text>
									</Text>
								) : (
									<Text>
										 {server.name}
										<Text dimColor> [{server.type.toUpperCase()}]</Text>
									</Text>
								)}
							</Text>
							{isSelected && (
								<Box flexDirection="column" marginLeft={3}>
									<Text dimColor>{server.description}</Text>
									{server.type === 'stdio' ? (
										<Text dimColor>Package: {server.package}</Text>
									) : (
										<Text dimColor>URL: {server.url}</Text>
									)}
									{server.requiresConfig && (
										<Text color="yellow" dimColor>
											⚠ {server.requiresConfig}
										</Text>
									)}
								</Box>
							)}
						</Box>
					);
				}}
			/>
		);
	}

	if (mode === 'tools' && viewingServerTools) {
		const mcpManager = MCPManager.getInstance();
		const allTools = mcpManager.getAllTools();
		const serverTools = allTools
			.filter(t => t.serverName === viewingServerTools)
			.map((t, idx) => ({
				id: String(idx),
				label: t.prefixedName,
				description: t.description,
			}));

		return (
			<BaseSelector
				items={serverTools}
				onSelect={() => {}}
				onCancel={() => {
					setViewingServerTools(null);
					setMode('list');
				}}
				title={`Tools: ${viewingServerTools}`}
				emptyMessage="No tools available"
				renderItem={(item: any, isSelected) => (
					<Box flexDirection="column" marginBottom={1}>
						<Box>
							<Text
								color={isSelected ? 'black' : 'green'}
								backgroundColor={isSelected ? 'cyan' : undefined}
								bold
							>
								{isSelected ? '>' : ' '} {item.label}
							</Text>
						</Box>
						{item.description && (
							<Box marginLeft={2}>
								<Text dimColor>{item.description}</Text>
							</Box>
						)}
					</Box>
				)}
			/>
		);
	}

	if (mode === 'list') {
		// Append "Add new" as a virtual item?
		// BaseSelector expects same type.
		// We can just handle it in render or actions?
		// Better to just have a "Add Server" item at the end.
		const itemsWithAdd = [
			...servers,
			{id: '__add_new__', label: 'Add new custom server'} as any,
		];

		return (
			<BaseSelector
				items={itemsWithAdd}
				onSelect={item => {
					if (item.id === '__add_new__') {
						setMode('add');
					}
				}}
				onCancel={() => setMode('menu')}
				title="Manage MCP Servers"
				emptyMessage="No MCP servers configured"
				footer={
					<Text dimColor>
						↑/↓ Navigate • Enter Add • v View Tools • t Toggle • d Delete • r
						Restart • ESC Back
					</Text>
				}
				actions={[
					{
						key: 't',
						onAction: item => {
							if (item.id === '__add_new__') return;
							const configManager = getConfig().getConfigManager();
							configManager.toggleMCPServer(item.name);
							loadServers();
							if (onRefresh) onRefresh();
						},
					},
					{
						key: 'd',
						onAction: item => {
							if (item.id === '__add_new__') return;
							const configManager = getConfig().getConfigManager();
							const mcpManager = MCPManager.getInstance();
							mcpManager.stopServer(item.name).catch(() => {});
							configManager.removeMCPServer(item.name);
							loadServers();
							if (onRefresh) onRefresh();
						},
					},
					{
						key: 'r',
						onAction: item => {
							if (item.id === '__add_new__') return;
							const mcpManager = MCPManager.getInstance();
							mcpManager
								.restartServer(item.name)
								.then(() => {
									loadServers();
									if (onRefresh) onRefresh();
								})
								.catch(() => loadServers());
						},
					},
					{
						key: 'v',
						onAction: item => {
							if (item.id === '__add_new__') return;
							if (item.connected && item.toolCount > 0) {
								setViewingServerTools(item.name);
								setMode('tools');
							}
						},
					},
				]}
				renderItem={(item: any, isSelected) => {
					if (item.id === '__add_new__') {
						return (
							<Box marginTop={1}>
								<Text
									color={isSelected ? 'black' : 'cyan'}
									backgroundColor={isSelected ? 'cyan' : undefined}
									bold
								>
									{isSelected ? '>' : ' '} {item.label}
								</Text>
							</Box>
						);
					}
					const server = item as ServerListItem;
					return (
						<Box>
							<Text
								color={isSelected ? 'black' : 'white'}
								backgroundColor={isSelected ? 'cyan' : undefined}
								bold={isSelected}
							>
								{isSelected ? '>' : ' '} {server.name}
							</Text>
							{server.config.disabled && <Text dimColor> (disabled)</Text>}
							{!server.config.disabled && server.connected && (
								<Text color="green"> ✓ {server.toolCount} tools</Text>
							)}
							{!server.config.disabled && !server.connected && (
								<Text color="red"> ✗ not connected</Text>
							)}
							{server.error && (
								<Text color="red" dimColor>
									{' '}
									- {server.error.substring(0, 50)}
								</Text>
							)}
						</Box>
					);
				}}
			/>
		);
	}

	// Menu Mode
	return (
		<BaseSelector
			items={MENU_ITEMS}
			onSelect={item => setMode(item.id as ViewMode)}
			onCancel={onCancel}
			title="MCP Server Management"
			footer={
				<Text dimColor>
					Select an option (↑/↓ to navigate, Enter to select, ESC to exit)
				</Text>
			}
		/>
	);
}
