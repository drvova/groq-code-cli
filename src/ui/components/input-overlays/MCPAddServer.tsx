import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {MCPServerConfig} from '../../../utils/local-settings.js';
import {getConfig} from '../../../core/config/index.js';
import {MCPManager} from '../../../core/mcp-manager.js';

interface MCPAddServerProps {
	onCancel: () => void;
	onSave: () => void;
}

export default function MCPAddServer({onCancel, onSave}: MCPAddServerProps) {
	const [addServerType, setAddServerType] = useState<'stdio' | 'http'>('stdio');
	const [addServerName, setAddServerName] = useState('');
	const [addServerCommand, setAddServerCommand] = useState('');
	const [addServerArgs, setAddServerArgs] = useState('');
	const [addServerUrl, setAddServerUrl] = useState('');
	const [addServerPrefix, setAddServerPrefix] = useState('');
	const [addInputStep, setAddInputStep] = useState<
		'type' | 'name' | 'command' | 'args' | 'url' | 'prefix'
	>('type');

	useInput((input, key) => {
		if (key.escape) {
			onCancel();
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
				const configManager = getConfig().getConfigManager();
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
				mcpManager
					.startServer(addServerName.trim(), serverConfig)
					.catch(() => {});

				onSave();
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
	});

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
							{addServerType === 'http' ? '→ HTTP' : '  HTTP'} - URL-based (Exa,
							remote servers)
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
										{addInputStep === 'command' && <Text color="cyan">_</Text>}
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
