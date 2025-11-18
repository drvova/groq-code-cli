import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';

export interface SelectorItem {
	id: string;
	label: string;
}

interface BaseSelectorProps<T extends SelectorItem> {
	items: T[];
	onSelect: (item: T) => void;
	onCancel: () => void;
	title: string;
	initialSelectedIndex?: number;
	renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
	loading?: boolean;
	error?: string | null;
	emptyMessage?: string;
	footer?: React.ReactNode;
	onDelete?: (item: T) => void;
	visibleItemCount?: number;
	actions?: {
		key: string;
		onAction: (item: T) => void;
	}[];
}

const DEFAULT_VISIBLE_COUNT = 10;

export default function BaseSelector<T extends SelectorItem>({
	items,
	onSelect,
	onCancel,
	title,
	initialSelectedIndex = 0,
	renderItem,
	loading = false,
	error = null,
	emptyMessage = 'No items found',
	footer,
	onDelete,
	visibleItemCount = DEFAULT_VISIBLE_COUNT,
	actions,
}: BaseSelectorProps<T>) {
	const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

	useEffect(() => {
		setSelectedIndex(initialSelectedIndex);
	}, [initialSelectedIndex]);

	useInput((input, key) => {
		if (loading) return;

		if (key.return) {
			if (items.length > 0) {
				onSelect(items[selectedIndex]);
			}
			return;
		}

		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if ((input === 'd' || input === 'D') && onDelete && items.length > 0) {
			onDelete(items[selectedIndex]);
			return;
		}

		if (actions && items.length > 0) {
			const action = actions.find(a => a.key === input);
			if (action) {
				action.onAction(items[selectedIndex]);
				return;
			}
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
		} else if (key.pageUp) {
			setSelectedIndex(prev => Math.max(0, prev - visibleItemCount));
		} else if (key.pageDown) {
			setSelectedIndex(prev => Math.min(items.length - 1, prev + visibleItemCount));
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column">
				<Text color="cyan">Loading {title.toLowerCase()}...</Text>
			</Box>
		);
	}

	if (items.length === 0 && !error) {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color="cyan" bold>
						{title}
					</Text>
				</Box>
				<Text color="gray">{emptyMessage}</Text>
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						Press ESC to close
					</Text>
				</Box>
			</Box>
		);
	}

	const halfVisible = Math.floor(visibleItemCount / 2);
	const startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(items.length, startIndex + visibleItemCount);
	const adjustedStart = Math.max(0, endIndex - visibleItemCount);
	const visibleItems = items.slice(adjustedStart, endIndex);

	// Scrollbar logic
	const showScrollbar = items.length > visibleItemCount;
	const scrollbarHeight = visibleItems.length;
	const scrollProgress = adjustedStart / (items.length - visibleItemCount);
	const thumbSize = Math.max(1, Math.round((visibleItemCount / items.length) * scrollbarHeight));
	const availableTrack = scrollbarHeight - thumbSize;
	const thumbPosition = Math.round(scrollProgress * availableTrack);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					{title} ({selectedIndex + 1}/{items.length})
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="yellow">⚠ {error}</Text>
				</Box>
			)}

			<Box flexDirection="row">
				<Box flexDirection="column" flexGrow={1}>
					{visibleItems.map((item, index) => {
						const actualIndex = adjustedStart + index;
						const isSelected = actualIndex === selectedIndex;
						
						if (renderItem) {
							return (
								<Box key={item.id}>
									{renderItem(item, isSelected)}
								</Box>
							);
						}

						return (
							<Box key={item.id}>
								<Text
									color={isSelected ? 'black' : 'white'}
									backgroundColor={isSelected ? 'cyan' : undefined}
									bold={isSelected}
								>
									{isSelected ? '>' : ' '} {item.label}
								</Text>
							</Box>
						);
					})}
				</Box>
				{showScrollbar && (
					<Box flexDirection="column" marginLeft={1}>
						{Array.from({length: scrollbarHeight}).map((_, i) => {
							const isThumb = i >= thumbPosition && i < thumbPosition + thumbSize;
							return (
								<Text key={i} color={isThumb ? 'cyan' : 'gray'}>
									{isThumb ? '█' : '│'}
								</Text>
							);
						})}
					</Box>
				)}
			</Box>

			{items.length > visibleItemCount && (
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						↑/↓/PgUp/PgDn to scroll
					</Text>
				</Box>
			)}

			{footer && (
				<Box marginTop={1}>
					{footer}
				</Box>
			)}
		</Box>
	);
}
