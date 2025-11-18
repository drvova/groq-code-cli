import React, {useState, useEffect} from 'react';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

interface AsyncSelectorProps<T extends SelectorItem> {
	items?: T[];
	fetcher: () => Promise<T[]>;
	onSelect: (item: T) => void;
	onCancel: () => void;
	title: string;
	currentItemId?: string;
	renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
	fallbackItems?: T[];
	errorMapper?: (error: unknown) => string;
	onLoadSuccess?: (items: T[]) => void;
}

export default function AsyncSelector<T extends SelectorItem>({
	items: propItems,
	fetcher,
	onSelect,
	onCancel,
	title,
	currentItemId,
	renderItem,
	fallbackItems = [],
	errorMapper = (e) => (e instanceof Error ? e.message : 'Unknown error'),
	onLoadSuccess,
}: AsyncSelectorProps<T>) {
	const [items, setItems] = useState<T[]>(propItems || fallbackItems);
	const [loading, setLoading] = useState(!propItems);
	const [error, setError] = useState<string | null>(null);
	const [initialIndex, setInitialIndex] = useState(0);

	useEffect(() => {
		if (propItems) {
			updateState(propItems);
			setLoading(false);
			return;
		}

		const load = async () => {
			try {
				const data = await fetcher();
				if (data.length > 0) {
					updateState(data);
					if (onLoadSuccess) onLoadSuccess(data);
				} else {
					updateState(fallbackItems);
				}
			} catch (err) {
				setError(errorMapper(err));
				updateState(fallbackItems);
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [propItems, currentItemId]);

	const updateState = (list: T[]) => {
		setItems(list);
		const currentIndex = list.findIndex(item => item.id === currentItemId);
		setInitialIndex(currentIndex >= 0 ? currentIndex : 0);
	};

	return (
		<BaseSelector
			items={items}
			onSelect={onSelect}
			onCancel={onCancel}
			title={title}
			initialSelectedIndex={initialIndex}
			loading={loading}
			error={error}
			renderItem={renderItem}
		/>
	);
}
