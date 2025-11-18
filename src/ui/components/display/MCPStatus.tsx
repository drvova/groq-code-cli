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

			// Only count servers that are both enabled AND have a configuration
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

	let color: string;
	let statusText: string;
	let dimColor = false;

	if (totalServers === 0) {
		// No servers configured - show greyed out indicator
		color = 'gray';
		statusText = 'MCP: -';
		dimColor = true;
	} else if (connectedCount === 0) {
		color = 'red';
		statusText = hasErrors
			? `MCP: OFF (${totalServers} error${totalServers > 1 ? 's' : ''})`
			: `MCP: OFF (${totalServers} disconnected)`;
	} else if (connectedCount < totalServers) {
		color = 'yellow';
		statusText = `MCP: ${connectedCount}/${totalServers}`;
	} else {
		color = 'green';
		statusText = `MCP: ${connectedCount}/${totalServers}`;
	}

	return (
		<Text color={color} dimColor={dimColor}>
			{statusText}
		</Text>
	);
}
