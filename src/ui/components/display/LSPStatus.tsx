/**
 * LSP Status Component - Display LSP diagnostics status in UI
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import React, {useState, useEffect} from 'react';
import {Text, Box} from 'ink';
import {LSPManager} from '../../../core/lsp-manager.js';
import {DISPLAY_CONFIG} from './utils/config.js';

interface LSPStatusProps {
	refreshInterval?: number;
	showDetails?: boolean;
}

export default function LSPStatus({
	refreshInterval = 2000,
	showDetails = false,
}: LSPStatusProps) {
	const [isRunning, setIsRunning] = useState(false);
	const [serverName, setServerName] = useState<string>('');
	const [autoStartAttempted, setAutoStartAttempted] = useState(false);
	const [stats, setStats] = useState({
		errors: 0,
		warnings: 0,
		info: 0,
		hints: 0,
		filesWithIssues: 0,
	});

	useEffect(() => {
		const updateStatus = () => {
			const manager = LSPManager.getInstance();
			const running = manager.getIsRunning();
			setIsRunning(running);

			if (running) {
				const detectedServer = manager.getDetectedServer();
				if (detectedServer) {
					setServerName(detectedServer.name);
				}

				const currentStats = manager.getStats();
				setStats(currentStats);
			} else {
				setServerName('');
				setStats({
					errors: 0,
					warnings: 0,
					info: 0,
					hints: 0,
					filesWithIssues: 0,
				});
			}
		};

		updateStatus();
		const interval = setInterval(updateStatus, refreshInterval);
		return () => clearInterval(interval);
	}, [refreshInterval]);

	useEffect(() => {
		const tryAutoStart = async () => {
			if (!autoStartAttempted) {
				const manager = LSPManager.getInstance();
				await manager.tryAutoStart();
				setAutoStartAttempted(true);
			}
		};

		tryAutoStart();
	}, [autoStartAttempted]);

	if (!isRunning) {
		return (
			<Text color="gray" dimColor>
				LSP: ○ Not Available
			</Text>
		);
	}

	const hasErrors = stats.errors > 0;
	const hasWarnings = stats.warnings > 0;
	const hasIssues = hasErrors || hasWarnings;

	let statusColor: 'green' | 'yellow' | 'red' = 'green';
	let statusSymbol = '●';

	if (hasErrors) {
		statusColor = 'red';
	} else if (hasWarnings) {
		statusColor = 'yellow';
	}

	if (showDetails) {
		return (
			<Box flexDirection="column">
				<Box>
					<Text color={statusColor}>{statusSymbol} LSP: </Text>
					<Text color="cyan">{serverName}</Text>
				</Box>
				{hasIssues && (
					<Box marginLeft={2}>
						{stats.errors > 0 && (
							<Text color="red">
								{stats.errors} error{stats.errors !== 1 ? 's' : ''}{' '}
							</Text>
						)}
						{stats.warnings > 0 && (
							<Text color="yellow">
								{stats.warnings} warning{stats.warnings !== 1 ? 's' : ''}{' '}
							</Text>
						)}
						{stats.filesWithIssues > 0 && (
							<Text color="gray">
								in {stats.filesWithIssues} file
								{stats.filesWithIssues !== 1 ? 's' : ''}
							</Text>
						)}
					</Box>
				)}
			</Box>
		);
	}

	// Compact format
	const issues: string[] = [];
	if (stats.errors > 0) issues.push(`${stats.errors}E`);
	if (stats.warnings > 0) issues.push(`${stats.warnings}W`);
	if (stats.info > 0) issues.push(`${stats.info}I`);

	const issueText = issues.length > 0 ? ` [${issues.join(' ')}]` : '';

	return (
		<Text color={statusColor}>
			{statusSymbol} LSP
			{issueText}
		</Text>
	);
}
