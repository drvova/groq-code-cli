import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {MCPManager} from '../../../core/mcp-manager.js';

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

	if (totalServers === 0) return null;

	let color: string;
	if (connectedCount === 0 || hasErrors) {
		color = 'red';
	} else if (connectedCount < totalServers) {
		color = 'yellow';
	} else {
		color = 'green';
	}

	return (
		<Text color={color}>
			MCP: {connectedCount}/{totalServers}
		</Text>
	);
}
