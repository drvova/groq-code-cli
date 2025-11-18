import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import {MCPManager} from '../../../core/mcp-manager.js';
import {getMCPStatusConfig} from './utils/status.js';

interface MCPStatusProps {
	refreshInterval?: number;
}

export default function MCPStatus({refreshInterval = 2000}: MCPStatusProps) {
	const [connectedCount, setConnectedCount] = useState(0);
	const [totalServers, setTotalServers] = useState(0);
	const [hasErrors, setHasErrors] = useState(false);

	useEffect(() => {
		const updateStatus = () => {
			const mcpManager = MCPManager.getInstance();
			const statuses = mcpManager.getServerStatus();

			const enabledServers = statuses.filter(s => !s.disabled);
			const connected = enabledServers.filter(s => s.connected);
			const withErrors = enabledServers.filter(s => s.error);

			setConnectedCount(connected.length);
			setTotalServers(enabledServers.length);
			setHasErrors(withErrors.length > 0);
		};

		updateStatus();
		const interval = setInterval(updateStatus, refreshInterval);
		return () => clearInterval(interval);
	}, [refreshInterval]);

	const statusConfig = getMCPStatusConfig({
		connectedCount,
		totalServers,
		hasErrors,
	});

	return (
		<Text color={statusConfig.color} dimColor={statusConfig.dimColor}>
			{statusConfig.text}
		</Text>
	);
}
