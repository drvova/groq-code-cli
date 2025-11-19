/**
 * Tool Selector - Interactive menu for tool management
 * Constitutional compliance: AMENDMENT VIII - Comprehensive implementation
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {ToolRegistry} from '../../../tools/registry/tool-registry.js';
import {ToolStateManager} from '../../../core/tool-state-manager.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

interface ToolSelectorProps {
	onCancel: () => void;
	onToolsChanged?: () => void;
}

interface ToolListItem extends SelectorItem {
	name: string;
	category: string;
	enabled: boolean;
	description: string;
}

export default function ToolSelector({
	onCancel,
	onToolsChanged,
}: ToolSelectorProps) {
	const [loading, setLoading] = useState(true);
	const [tools, setTools] = useState<ToolListItem[]>([]);
	const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadTools();
	}, [filterEnabled]);

	const loadTools = () => {
		try {
			setLoading(true);
			setError(null);

			const stateManager = ToolStateManager.getInstance();
			const allSchemas = ToolRegistry.getAllSchemas();

			let toolItems: ToolListItem[] = allSchemas.map(schema => {
				const toolName = schema.function.name;
				const category = ToolRegistry.getToolCategory(toolName) || 'unknown';
				const enabled = stateManager.isToolEnabled(toolName);

				return {
					id: toolName,
					name: toolName,
					label: toolName,
					category,
					enabled,
					description: schema.function.description,
				};
			});

			// Apply filter
			if (filterEnabled === 'enabled') {
				toolItems = toolItems.filter(t => t.enabled);
			} else if (filterEnabled === 'disabled') {
				toolItems = toolItems.filter(t => !t.enabled);
			}

			// Sort: enabled first, then by category, then alphabetically
			toolItems.sort((a, b) => {
				if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
				if (a.category !== b.category) return a.category.localeCompare(b.category);
				return a.name.localeCompare(b.name);
			});

			setTools(toolItems);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleToggle = (item: ToolListItem) => {
		const stateManager = ToolStateManager.getInstance();
		stateManager.toggleTool(item.name, item.category);
		loadTools();
		onToolsChanged?.();
	};

	const handleEnableAll = () => {
		const stateManager = ToolStateManager.getInstance();
		stateManager.enableAll();
		loadTools();
		onToolsChanged?.();
	};

	const handleDisableAll = () => {
		const stateManager = ToolStateManager.getInstance();
		stateManager.disableAll();
		loadTools();
		onToolsChanged?.();
	};

	const handleReset = () => {
		const stateManager = ToolStateManager.getInstance();
		stateManager.reset();
		loadTools();
		onToolsChanged?.();
	};

	const cycleFilter = () => {
		setFilterEnabled(prev => {
			if (prev === 'all') return 'enabled';
			if (prev === 'enabled') return 'disabled';
			return 'all';
		});
	};

	const renderItem = (item: ToolListItem, isSelected: boolean) => {
		const statusSymbol = item.enabled ? '✓' : '○';
		const statusColor = item.enabled ? 'green' : 'gray';
		const selectedSymbol = isSelected ? '❯ ' : '  ';
		const categoryColor =
			item.category === 'safe' ? 'green' :
			item.category === 'approval_required' ? 'yellow' :
			item.category === 'dangerous' ? 'red' : 'gray';

		return (
			<Box key={item.id} flexDirection="column">
				<Box>
					<Text color={isSelected ? 'cyan' : 'white'}>
						{selectedSymbol}
						<Text color={statusColor}>{statusSymbol}</Text> {item.name}{' '}
						<Text color={categoryColor} dimColor>[{item.category}]</Text>
					</Text>
				</Box>
				{isSelected && (
					<Box marginLeft={4}>
						<Text color="gray" dimColor>{item.description.slice(0, 80)}...</Text>
					</Box>
				)}
			</Box>
		);
	};

	const stateManager = ToolStateManager.getInstance();
	const stats = stateManager.getStats();

	const footer = (
		<Box flexDirection="column" marginTop={1}>
			<Box>
				<Text dimColor>
					<Text color="green">↑↓</Text> Navigate{' '}
					<Text color="green">Enter</Text> Toggle{' '}
					<Text color="green">A</Text> Enable All{' '}
					<Text color="green">D</Text> Disable All{' '}
					<Text color="green">F</Text> Filter{' '}
					<Text color="green">R</Text> Reset{' '}
					<Text color="green">Esc</Text> Close
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text>
					<Text color="green">●</Text> Enabled: {stats.enabled}{' '}
					<Text color="gray">○</Text> Disabled: {stats.disabled}{' '}
					<Text dimColor>Total: {stats.total}</Text>
				</Text>
			</Box>
			<Box>
				<Text dimColor>
					Filter: <Text color="cyan">{filterEnabled}</Text>
				</Text>
			</Box>
			{error && (
				<Box marginTop={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text color="yellow" dimColor>
					Note: Tool changes take effect immediately for new requests
				</Text>
			</Box>
		</Box>
	);

	return (
		<BaseSelector
			items={tools}
			onSelect={handleToggle}
			onCancel={onCancel}
			title="Tool Manager"
			renderItem={renderItem}
			loading={loading}
			error={error}
			emptyMessage={
				filterEnabled === 'all'
					? 'No tools registered'
					: `No ${filterEnabled} tools found`
			}
			footer={footer}
			actions={[
				{key: 'a', onAction: () => handleEnableAll()},
				{key: 'A', onAction: () => handleEnableAll()},
				{key: 'd', onAction: () => handleDisableAll()},
				{key: 'D', onAction: () => handleDisableAll()},
				{key: 'f', onAction: () => cycleFilter()},
				{key: 'F', onAction: () => cycleFilter()},
				{key: 'r', onAction: () => handleReset()},
				{key: 'R', onAction: () => handleReset()},
			]}
			visibleItemCount={12}
		/>
	);
}
