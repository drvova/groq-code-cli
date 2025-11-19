/**
 * Tool Selector - Interactive menu for tool management
 * Constitutional compliance: AMENDMENT VIII - Comprehensive implementation
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 * Minimal terminal UI design - clarity through restraint
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
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadTools();
	}, []);

	const loadTools = () => {
		try {
			setLoading(true);
			setError(null);

			const stateManager = ToolStateManager.getInstance();
			const allSchemas = ToolRegistry.getAllSchemas();

			const toolItems: ToolListItem[] = allSchemas.map(schema => {
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

			toolItems.sort((a, b) => {
				if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
				if (a.category !== b.category)
					return a.category.localeCompare(b.category);
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

	const renderItem = (item: ToolListItem, isSelected: boolean) => {
		const statusIcon = item.enabled ? '●' : '○';
		const statusColor = item.enabled ? 'green' : 'gray';
		const categoryColor =
			item.category === 'safe'
				? 'green'
				: item.category === 'approval_required'
				? 'yellow'
				: item.category === 'dangerous'
				? 'red'
				: 'gray';

		const pointer = isSelected ? '›' : ' ';

		return (
			<Box key={item.id} flexDirection="column">
				<Box>
					<Text color={isSelected ? 'cyan' : 'gray'}>{pointer} </Text>
					<Text color={statusColor}>{statusIcon}</Text>
					<Text> </Text>
					<Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
						{item.name}
					</Text>
					<Text color={categoryColor} dimColor>
						{' '}
						· {item.category}
					</Text>
				</Box>
				{isSelected && (
					<Box marginLeft={4}>
						<Text color="gray" dimColor>
							{item.description.slice(0, 80)}
							{item.description.length > 80 ? '…' : ''}
						</Text>
					</Box>
				)}
			</Box>
		);
	};

	const stateManager = ToolStateManager.getInstance();
	const stats = stateManager.getStats();

	const footer = (
		<Box flexDirection="column" marginTop={1}>
			<Box marginBottom={1}>
				<Text dimColor>
					<Text color="cyan">↑↓</Text> navigate
					<Text color="green">enter</Text> toggle
					<Text color="gray">esc</Text> close
				</Text>
			</Box>

			<Box>
				<Text color="green">●</Text>
				<Text dimColor> {stats.enabled} enabled</Text>
				<Text dimColor> · </Text>
				<Text color="gray">○</Text>
				<Text dimColor> {stats.disabled} disabled</Text>
				<Text dimColor> · </Text>
				<Text dimColor>{stats.total} total</Text>
			</Box>

			{error && (
				<Box marginTop={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}
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
			emptyMessage="No tools registered"
			footer={footer}
			actions={[]}
			visibleItemCount={12}
		/>
	);
}
