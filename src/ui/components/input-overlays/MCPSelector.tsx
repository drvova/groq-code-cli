import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {ConfigManager, MCPServerConfig} from '../../../utils/local-settings.js';
import {MCPManager} from '../../../core/mcp-manager.js';

interface MCPSelectorProps {
	onCancel: () => void;
	onRefresh?: () => void;
}

interface ServerListItem {
	name: string;
	config: MCPServerConfig;
	connected: boolean;
	toolCount: number;
	error?: string;
}

interface PopularServerBase {
	name: string;
	description: string;
	prefix: string;
	requiresConfig?: string;
}

interface PopularServerStdio extends PopularServerBase {
	type: 'stdio';
	package: string;
	command: string;
	args: string[];
}

interface PopularServerHTTP extends PopularServerBase {
	type: 'http';
	url: string;
}

type PopularServer = PopularServerStdio | PopularServerHTTP;

const POPULAR_SERVERS: PopularServer[] = [
	{
		type: 'stdio',
		name: 'Exa AI Search',
		package: 'mcp-remote',
		description: 'Advanced AI-powered web search and research',
		command: 'npx',
		args: ['-y', 'mcp-remote', 'https://mcp.exa.ai/mcp'],
		prefix: 'exa',
		requiresConfig: 'No API key required - connects to hosted service',
	},
	{
		type: 'stdio',
		name: 'Brave Search',
		package: '@modelcontextprotocol/server-brave-search',
		description: 'Web search powered by Brave Search API',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-brave-search'],
		prefix: 'brave',
		requiresConfig: 'Requires BRAVE_API_KEY environment variable',
	},
	{
		type: 'stdio',
		name: 'Filesystem',
		package: '@modelcontextprotocol/server-filesystem',
		description: 'Read and write files in allowed directories',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-filesystem'],
		prefix: 'fs',
		requiresConfig: 'Add directory path to args',
	},
	{
		type: 'stdio',
		name: 'GitHub',
		package: '@modelcontextprotocol/server-github',
		description: 'Interact with GitHub repositories and issues',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-github'],
		prefix: 'github',
		requiresConfig: 'Requires GITHUB_TOKEN environment variable',
	},
	{
		type: 'stdio',
		name: 'PostgreSQL',
		package: '@modelcontextprotocol/server-postgres',
		description: 'Query and manage PostgreSQL databases',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-postgres'],
		prefix: 'pg',
		requiresConfig: 'Requires DATABASE_URL environment variable',
	},
	{
		type: 'stdio',
		name: 'SQLite',
		package: '@modelcontextprotocol/server-sqlite',
		description: 'Query and manage SQLite databases',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-sqlite'],
		prefix: 'sqlite',
		requiresConfig: 'Add database path to args',
	},
];

type ViewMode = 'menu' | 'list' | 'add' | 'browse' | 'tools';

export default function MCPSelector({onCancel, onRefresh}: MCPSelectorProps) {
	const [servers, setServers] = useState<ServerListItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [mode, setMode] = useState<ViewMode>('menu');
	const [viewingServerTools, setViewingServerTools] = useState<string | null>(
		null,
	);
	const [addServerType, setAddServerType] = useState<'stdio' | 'http'>('stdio');
	const [addServerName, setAddServerName] = useState('');
	const [addServerCommand, setAddServerCommand] = useState('');
	const [addServerArgs, setAddServerArgs] = useState('');
	const [addServerUrl, setAddServerUrl] = useState('');
	const [addServerPrefix, setAddServerPrefix] = useState('');
	const [addInputStep, setAddInputStep] = useState<
		'type' | 'name' | 'command' | 'args' | 'url' | 'prefix'
	>('type');

	const loadServers = async () => {
		const configManager = new ConfigManager();
		const mcpManager = MCPManager.getInstance();

		await mcpManager.initializeServers();

		const serverConfigs = configManager.getMCPServers();
		const statuses = mcpManager.getServerStatus();

		const serverList: ServerListItem[] = Object.entries(serverConfigs).map(
			([name, config]) => {
				const status = statuses.find(s => s.name === name);
				return {
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

	useInput((input, key) => {
		if (mode === 'menu') {
			handleMenuInput(input, key);
		} else if (mode === 'add') {
			handleAddInput(input, key);
		} else if (mode === 'browse') {
			handleBrowseInput(input, key);
		} else if (mode === 'tools') {
			handleToolsInput(input, key);
		} else {
			handleListInput(input, key);
		}
	});

	const handleMenuInput = (input: string, key: any) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(2, prev + 1));
		}

		if (key.return) {
			if (selectedIndex === 0) {
				// Manage existing servers
				setMode('list');
				setSelectedIndex(0);
			} else if (selectedIndex === 1) {
				// Add custom server
				setMode('add');
				setAddInputStep('type');
				setAddServerType('stdio');
				setAddServerName('');
				setAddServerCommand('');
				setAddServerArgs('');
				setAddServerUrl('');
				setAddServerPrefix('');
			} else if (selectedIndex === 2) {
				// Browse popular servers
				setMode('browse');
				setSelectedIndex(0);
			}
		}
	};

	const handleListInput = (input: string, key: any) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			setMode('menu');
			setSelectedIndex(0);
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(servers.length, prev + 1));
		}

		if (key.return) {
			if (selectedIndex === servers.length) {
				// "Add new server" option selected
				setMode('add');
				setAddInputStep('type');
				setAddServerType('stdio');
				setAddServerName('');
				setAddServerCommand('');
				setAddServerArgs('');
				setAddServerUrl('');
				setAddServerPrefix('');
			}
		}

		// Toggle server enabled/disabled with 't'
		if (input === 't' && selectedIndex < servers.length) {
			const server = servers[selectedIndex];
			const configManager = new ConfigManager();
			configManager.toggleMCPServer(server.name);
			loadServers();
			if (onRefresh) onRefresh();
		}

		// Remove server with 'd'
		if (input === 'd' && selectedIndex < servers.length) {
			const server = servers[selectedIndex];
			const configManager = new ConfigManager();
			const mcpManager = MCPManager.getInstance();

			mcpManager.stopServer(server.name).catch(() => {});
			configManager.removeMCPServer(server.name);

			loadServers();
			if (selectedIndex >= servers.length - 1) {
				setSelectedIndex(Math.max(0, servers.length - 2));
			}
			if (onRefresh) onRefresh();
		}

		// Restart server with 'r'
		if (input === 'r' && selectedIndex < servers.length) {
			const server = servers[selectedIndex];
			const mcpManager = MCPManager.getInstance();

			mcpManager
				.restartServer(server.name)
				.then(() => {
					loadServers();
					if (onRefresh) onRefresh();
				})
				.catch(() => {
					loadServers();
				});
		}

		// View server tools with 'v'
		if (input === 'v' && selectedIndex < servers.length) {
			const server = servers[selectedIndex];
			if (server.connected && server.toolCount > 0) {
				setViewingServerTools(server.name);
				setMode('tools');
			}
		}
	};

	const handleToolsInput = (input: string, key: any) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			setViewingServerTools(null);
			setMode('list');
			return;
		}
	};

	const handleBrowseInput = (input: string, key: any) => {
		if (key.escape || (key.ctrl && input === 'c')) {
			setMode('menu');
			setSelectedIndex(0);
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(POPULAR_SERVERS.length - 1, prev + 1));
		}

		if (key.return) {
			// Quick install selected popular server
			const server = POPULAR_SERVERS[selectedIndex];
			const configManager = new ConfigManager();
			const mcpManager = MCPManager.getInstance();

			const serverName =
				server.prefix || server.name.toLowerCase().replace(/\s+/g, '-');

			let serverConfig: MCPServerConfig;

			if (server.type === 'http') {
				serverConfig = {
					type: 'http',
					url: server.url,
					toolPrefix: server.prefix,
				};
			} else {
				serverConfig = {
					type: 'stdio',
					command: server.command,
					args: server.args,
					toolPrefix: server.prefix,
				};
			}

			configManager.setMCPServer(serverName, serverConfig);

			// Try to start the server
			mcpManager.startServer(serverName, serverConfig).catch(() => {});

			setMode('list');
			loadServers();
			if (onRefresh) onRefresh();
		}
	};

	const handleAddInput = (input: string, key: any) => {
		if (key.escape) {
			setMode('menu');
			setSelectedIndex(0);
			return;
		}

		// Type selection step
		if (addInputStep === 'type') {
			if (key.upArrow || key.downArrow) {
				setAddServerType(prev => (prev === 'stdio' ? 'http' : 'stdio'));
			}
			if (key.return) {
				setAddInputStep('name');
			}
			return;
		}

		if (key.return) {
			if (addInputStep === 'name' && addServerName.trim()) {
				if (addServerType === 'http') {
					setAddInputStep('url');
				} else {
					setAddInputStep('command');
				}
			} else if (addInputStep === 'command' && addServerCommand.trim()) {
				setAddInputStep('args');
			} else if (addInputStep === 'args') {
				setAddInputStep('prefix');
			} else if (addInputStep === 'url' && addServerUrl.trim()) {
				setAddInputStep('prefix');
			} else if (addInputStep === 'prefix') {
				// Save the server
				const configManager = new ConfigManager();
				const mcpManager = MCPManager.getInstance();

				let serverConfig: MCPServerConfig;

				if (addServerType === 'http') {
					serverConfig = {
						type: 'http',
						url: addServerUrl.trim(),
						toolPrefix: addServerPrefix.trim() || undefined,
					};
				} else {
					const args = addServerArgs
						.trim()
						.split(' ')
						.filter(a => a.length > 0);

					serverConfig = {
						type: 'stdio',
						command: addServerCommand.trim(),
						args,
						toolPrefix: addServerPrefix.trim() || undefined,
					};
				}

				configManager.setMCPServer(addServerName.trim(), serverConfig);

				// Try to start the server
				mcpManager
					.startServer(addServerName.trim(), serverConfig)
					.catch(() => {});

				setMode('list');
				loadServers();
				if (onRefresh) onRefresh();
			}
			return;
		}

		if (key.backspace || key.delete) {
			if (addInputStep === 'name') {
				setAddServerName(prev => prev.slice(0, -1));
			} else if (addInputStep === 'command') {
				setAddServerCommand(prev => prev.slice(0, -1));
			} else if (addInputStep === 'args') {
				setAddServerArgs(prev => prev.slice(0, -1));
			} else if (addInputStep === 'url') {
				setAddServerUrl(prev => prev.slice(0, -1));
			} else if (addInputStep === 'prefix') {
				setAddServerPrefix(prev => prev.slice(0, -1));
			}
			return;
		}

		if (input && !key.ctrl && !key.meta) {
			if (addInputStep === 'name') {
				setAddServerName(prev => prev + input);
			} else if (addInputStep === 'command') {
				setAddServerCommand(prev => prev + input);
			} else if (addInputStep === 'args') {
				setAddServerArgs(prev => prev + input);
			} else if (addInputStep === 'url') {
				setAddServerUrl(prev => prev + input);
			} else if (addInputStep === 'prefix') {
				setAddServerPrefix(prev => prev + input);
			}
		}
	};

	// Tools view
	if (mode === 'tools' && viewingServerTools) {
		const mcpManager = MCPManager.getInstance();
		const allTools = mcpManager.getAllTools();
		const serverTools = allTools.filter(
			t => t.serverName === viewingServerTools,
		);

		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold color="cyan">
						Tools: {viewingServerTools}
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text dimColor>ESC to go back</Text>
				</Box>

				<Box flexDirection="column">
					{serverTools.map((tool, idx) => (
						<Box key={idx} marginBottom={1} flexDirection="column">
							<Box>
								<Text bold color="green">
									{tool.prefixedName}
								</Text>
							</Box>
							{tool.description && (
								<Box marginLeft={2}>
									<Text dimColor>{tool.description}</Text>
								</Box>
							)}
						</Box>
					))}
				</Box>

				{serverTools.length === 0 && (
					<Box>
						<Text color="yellow">No tools available</Text>
					</Box>
				)}
			</Box>
		);
	}

	// Menu view
	if (mode === 'menu') {
		const hasServers = servers.length > 0;

		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold color="cyan">
						MCP Server Management
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text dimColor>
						Select an option (↑/↓ to navigate, Enter to select, ESC to exit)
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						{selectedIndex === 0 ? (
							<Text color="cyan" bold>
								→ Manage existing servers ({servers.length})
							</Text>
						) : (
							<Text dimColor={!hasServers}>
								Manage existing servers ({servers.length})
							</Text>
						)}
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						{selectedIndex === 1 ? (
							<Text color="cyan" bold>
								→ Add custom server
							</Text>
						) : (
							<Text> Add custom server</Text>
						)}
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						{selectedIndex === 2 ? (
							<Text color="cyan" bold>
								→ Browse popular servers
							</Text>
						) : (
							<Text> Browse popular servers</Text>
						)}
					</Text>
				</Box>
			</Box>
		);
	}

	// Browse popular servers view
	if (mode === 'browse') {
		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold color="cyan">
						Popular MCP Servers
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text dimColor>↑/↓ Navigate • Enter Quick Install • ESC Back</Text>
				</Box>

				<Box flexDirection="column">
					{POPULAR_SERVERS.map((server, index) => (
						<Box
							key={server.type === 'stdio' ? server.package : server.url}
							flexDirection="column"
							marginBottom={1}
						>
							<Text>
								{selectedIndex === index ? (
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
							{selectedIndex === index && (
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
					))}
				</Box>

				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to quick-install (HTTP: instant, STDIO: uses npx)
					</Text>
				</Box>
			</Box>
		);
	}

	// Add server view
	if (mode === 'add') {
		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold color="cyan">
						Add Custom MCP Server
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text dimColor>Press ESC to go back</Text>
				</Box>

				{addInputStep === 'type' && (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text>
								Transport type:{' '}
								<Text color="yellow">{addServerType.toUpperCase()}</Text>
							</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>
								{addServerType === 'stdio' ? '→ STDIO' : '  STDIO'} -
								Process-based (npx, node, python)
							</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>
								{addServerType === 'http' ? '→ HTTP' : '  HTTP'} - URL-based
								(Exa, remote servers)
							</Text>
						</Box>
						<Box marginTop={1}>
							<Text dimColor>Use ↑/↓ to select, press Enter to continue</Text>
						</Box>
					</Box>
				)}

				{addInputStep !== 'type' && (
					<>
						<Box marginBottom={1}>
							<Text>
								Type: <Text color="yellow">{addServerType.toUpperCase()}</Text>
							</Text>
						</Box>

						<Box marginBottom={1}>
							<Text>
								Server name: <Text color="yellow">{addServerName}</Text>
								{addInputStep === 'name' && <Text color="cyan">_</Text>}
							</Text>
						</Box>

						{addServerType === 'stdio' && (
							<>
								{(addInputStep === 'command' ||
									addInputStep === 'args' ||
									addInputStep === 'prefix') && (
									<Box marginBottom={1}>
										<Text>
											Command: <Text color="yellow">{addServerCommand}</Text>
											{addInputStep === 'command' && (
												<Text color="cyan">_</Text>
											)}
										</Text>
									</Box>
								)}

								{(addInputStep === 'args' || addInputStep === 'prefix') && (
									<Box marginBottom={1}>
										<Text>
											Arguments:{' '}
											<Text color="yellow">{addServerArgs || '(none)'}</Text>
											{addInputStep === 'args' && <Text color="cyan">_</Text>}
										</Text>
									</Box>
								)}
							</>
						)}

						{addServerType === 'http' && (
							<>
								{(addInputStep === 'url' || addInputStep === 'prefix') && (
									<Box marginBottom={1}>
										<Text>
											URL: <Text color="yellow">{addServerUrl}</Text>
											{addInputStep === 'url' && <Text color="cyan">_</Text>}
										</Text>
									</Box>
								)}
							</>
						)}

						{addInputStep === 'prefix' && (
							<Box marginBottom={1}>
								<Text>
									Tool prefix (optional):{' '}
									<Text color="yellow">{addServerPrefix || '(none)'}</Text>
									<Text color="cyan">_</Text>
								</Text>
							</Box>
						)}

						<Box marginTop={1}>
							<Text dimColor>
								{addInputStep === 'name' &&
									'Enter server name (e.g., "brave-search" or "exa")'}
								{addInputStep === 'command' && 'Enter command (e.g., "npx")'}
								{addInputStep === 'args' &&
									'Enter arguments (e.g., "-y @modelcontextprotocol/server-brave-search")'}
								{addInputStep === 'url' &&
									'Enter URL (e.g., "https://mcp.exa.ai/mcp")'}
								{addInputStep === 'prefix' &&
									'Enter tool prefix (e.g., "brave" or "exa") or press Enter to skip'}
							</Text>
						</Box>
					</>
				)}
			</Box>
		);
	}

	// List/manage servers view
	return (
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Manage MCP Servers
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>
					↑/↓ Navigate • Enter Add • v View Tools • t Toggle • d Delete • r
					Restart • ESC Back
				</Text>
			</Box>

			{servers.length === 0 ? (
				<Box marginBottom={1}>
					<Text dimColor>No MCP servers configured</Text>
				</Box>
			) : (
				<Box flexDirection="column">
					{servers.map((server, index) => (
						<Box key={server.name} marginBottom={0}>
							<Text>
								{selectedIndex === index ? (
									<Text color="cyan" bold>
										→{' '}
									</Text>
								) : (
									<Text> </Text>
								)}
								<Text bold color={server.config.disabled ? 'gray' : 'white'}>
									{server.name}
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
							</Text>
						</Box>
					))}
				</Box>
			)}

			<Box marginTop={1}>
				<Text>
					{selectedIndex === servers.length ? (
						<Text color="cyan" bold>
							→ Add new custom server
						</Text>
					) : (
						<Text dimColor> Add new custom server</Text>
					)}
				</Text>
			</Box>
		</Box>
	);
}
