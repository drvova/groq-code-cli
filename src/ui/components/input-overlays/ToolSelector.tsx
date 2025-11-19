/**
 * Tool Selector - Interactive menu for tool management
 * Constitutional compliance: AMENDMENT VIII - Comprehensive implementation
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 * Enhanced terminal UI aesthetics with box drawing and refined typography
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
	const [filterEnabled, setFilterEnabled] = useState<
		'all' | 'enabled' | 'disabled'
	>('all');
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

			if (filterEnabled === 'enabled') {
				toolItems = toolItems.filter(t => t.enabled);
			} else if (filterEnabled === 'disabled') {
				toolItems = toolItems.filter(t => !t.enabled);
			}

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

	const getCategoryIcon = (category: string): string => {
		switch (category) {
			case 'safe':
				return '◆';
			case 'approval_required':
				return '◇';
			case 'dangerous':
				return '◈';
			default:
				return '○';
		}
	};

	const getCategoryLabel = (category: string): string => {
		switch (category) {
			case 'safe':
				return 'SAFE';
			case 'approval_required':
				return 'REQUIRES APPROVAL';
			case 'dangerous':
				return 'DANGEROUS';
			default:
				return category.toUpperCase();
		}
	};

	const renderItem = (item: ToolListItem, isSelected: boolean) => {
		const statusIcon = item.enabled ? '●' : '○';
		const statusColor = item.enabled ? 'green' : 'gray';
		const categoryIcon = getCategoryIcon(item.category);
		const categoryColor =
			item.category === 'safe'
				? 'green'
				: item.category === 'approval_required'
				? 'yellow'
				: item.category === 'dangerous'
				? 'red'
				: 'gray';

		const pointer = isSelected ? '▶' : ' ';
		const pointerColor = isSelected ? 'cyan' : 'gray';

		return (
			<Box key={item.id} flexDirection="column">
				<Box>
					<Text color={pointerColor}>{pointer} </Text>
					<Text color={statusColor} bold>
						{statusIcon}
					</Text>
					<Text> </Text>
					<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
						{item.name}
					</Text>
					<Text> </Text>
					<Text color={categoryColor} dimColor>
						{categoryIcon} {getCategoryLabel(item.category)}
					</Text>
				</Box>
				{isSelected && (
					<Box marginLeft={4} marginTop={0}>
						<Text color="gray" dimColor>
							└─ {item.description.slice(0, 75)}
							{item.description.length > 75 ? '…' : ''}
						</Text>
					</Box>
				)}
			</Box>
		);
	};

	const stateManager = ToolStateManager.getInstance();
	const stats = stateManager.getStats();

	const getFilterIcon = (filter: string): string => {
		switch (filter) {
			case 'all':
				return '◉';
			case 'enabled':
				return '●';
			case 'disabled':
				return '○';
			default:
				return '○';
		}
	};

	const footer = (
		<Box
			flexDirection="column"
			marginTop={1}
			paddingTop={1}
			borderStyle="single"
			borderTop
		>
			<Box marginBottom={1}>
				<Text dimColor>
					┌─{' '}
					<Text color="cyan" bold>
						CONTROLS
					</Text>{' '}
					─┐
				</Text>
			</Box>
			<Box marginLeft={2}>
				<Text>
					<Text color="cyan" bold>
						↑ ↓
					</Text>{' '}
					<Text dimColor>Navigate</Text>
					{'  '}
					<Text color="green" bold>
						⏎
					</Text>{' '}
					<Text dimColor>Toggle</Text>
					{'  '}
					<Text color="magenta" bold>
						A
					</Text>{' '}
					<Text dimColor>All On</Text>
					{'  '}
					<Text color="red" bold>
						D
					</Text>{' '}
					<Text dimColor>All Off</Text>
					{'  '}
					<Text color="yellow" bold>
						F
					</Text>{' '}
					<Text dimColor>Filter</Text>
					{'  '}
					<Text color="blue" bold>
						R
					</Text>{' '}
					<Text dimColor>Reset</Text>
					{'  '}
					<Text color="gray" bold>
						Esc
					</Text>{' '}
					<Text dimColor>Exit</Text>
				</Text>
			</Box>

			<Box marginTop={1} marginBottom={1}>
				<Text dimColor>
					├─{' '}
					<Text color="cyan" bold>
						STATISTICS
					</Text>{' '}
					─┤
				</Text>
			</Box>
			<Box marginLeft={2}>
				<Text>
					<Text color="green" bold>
						● {stats.enabled}
					</Text>
					<Text dimColor> enabled</Text>
					{'  │  '}
					<Text color="gray" bold>
						○ {stats.disabled}
					</Text>
					<Text dimColor> disabled</Text>
					{'  │  '}
					<Text color="white" bold>
						◉ {stats.total}
					</Text>
					<Text dimColor> total</Text>
				</Text>
			</Box>

			<Box marginTop={1} marginBottom={1}>
				<Text dimColor>
					├─{' '}
					<Text color="cyan" bold>
						CURRENT FILTER
					</Text>{' '}
					─┤
				</Text>
			</Box>
			<Box marginLeft={2}>
				<Text>
					<Text color="yellow" bold>
						{getFilterIcon(filterEnabled)}
					</Text>{' '}
					<Text color="cyan" bold>
						{filterEnabled.toUpperCase()}
					</Text>
					<Text dimColor> view</Text>
				</Text>
			</Box>

			{error && (
				<Box marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
					<Text color="red" bold>
						⚠ ERROR:
					</Text>
					<Text> {error}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					└─{' '}
					<Text color="yellow">Changes apply immediately to new requests</Text>{' '}
					─┘
				</Text>
			</Box>
		</Box>
	);

	return (
		<BaseSelector
			items={tools}
			onSelect={handleToggle}
			onCancel={onCancel}
			title="╔═══ TOOL MANAGEMENT CONSOLE ═══╗"
			renderItem={renderItem}
			loading={loading}
			error={error}
			emptyMessage={
				filterEnabled === 'all'
					? '╰─ No tools registered ─╯'
					: `╰─ No ${filterEnabled} tools found ─╯`
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
