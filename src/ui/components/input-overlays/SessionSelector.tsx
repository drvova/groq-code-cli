import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {
	SessionManager,
	SessionMetadata,
} from '../../../utils/session-manager.js';
import {
	formatTokenCount,
	formatRelativeDate,
} from '../display/utils/formatting.js';
import BaseSelector, {SelectorItem} from './BaseSelector.js';

interface SessionSelectorProps {
	onSubmit: (sessionId: string) => void;
	onDelete?: (sessionId: string) => void;
	onCancel: () => void;
}

interface SessionItem extends SelectorItem, SessionMetadata {}

export default function SessionSelector({
	onSubmit,
	onDelete,
	onCancel,
}: SessionSelectorProps) {
	const [sessions, setSessions] = useState<SessionMetadata[]>([]);

	const loadSessions = () => {
		const sessionManager = new SessionManager();
		return sessionManager.listSessions();
	};

	useEffect(() => {
		setSessions(loadSessions());
	}, []);

	const handleDelete = (item: SessionItem) => {
		if (onDelete) {
			onDelete(item.id);
			// Reload sessions after delete
			setSessions(loadSessions());
		}
	};

	const items: SessionItem[] = sessions.map(s => ({
		...s,
		label: s.name,
	}));

	return (
		<BaseSelector
			items={items}
			onSelect={(item) => onSubmit(item.id)}
			onCancel={onCancel}
			title="Select Session"
			onDelete={onDelete ? handleDelete : undefined}
			emptyMessage="No Saved Sessions. Sessions are auto-saved when you use /new."
			footer={
				<Text color="gray" dimColor>
					↵ select • D delete • ESC cancel
				</Text>
			}
			renderItem={(item, isSelected) => (
				<Box flexDirection="column">
					<Box>
						<Text
							color={isSelected ? 'black' : 'white'}
							backgroundColor={isSelected ? 'cyan' : undefined}
							bold={isSelected}
						>
							{isSelected ? '>' : ' '} {item.label}
						</Text>
					</Box>
					{isSelected && (
						<Box marginLeft={2}>
							<Text color="gray" dimColor>
								{formatRelativeDate(item.timestamp)} •{' '}
								{item.messageCount} msgs •{' '}
								{formatTokenCount(item.totalTokens)} tokens •{' '}
								{item.provider}/{item.model}
							</Text>
						</Box>
					)}
				</Box>
			)}
		/>
	);
}
