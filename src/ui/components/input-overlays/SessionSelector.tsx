import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {
	SessionManager,
	SessionMetadata,
} from '../../../utils/session-manager.js';
import {formatTokenCount} from '../display/utils/formatting.js';

interface SessionSelectorProps {
	onSubmit: (sessionId: string) => void;
	onDelete?: (sessionId: string) => void;
	onCancel: () => void;
}

const VISIBLE_ITEM_COUNT = 10;

export default function SessionSelector({
	onSubmit,
	onDelete,
	onCancel,
}: SessionSelectorProps) {
	const [sessions, setSessions] = useState<SessionMetadata[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		const sessionManager = new SessionManager();
		const loadedSessions = sessionManager.listSessions();
		setSessions(loadedSessions);
	}, []);

	const refreshSessions = () => {
		const sessionManager = new SessionManager();
		const loadedSessions = sessionManager.listSessions();
		setSessions(loadedSessions);
		if (selectedIndex >= loadedSessions.length && loadedSessions.length > 0) {
			setSelectedIndex(loadedSessions.length - 1);
		}
	};

	useInput((input, key) => {
		if (key.return) {
			if (sessions.length > 0) {
				onSubmit(sessions[selectedIndex].id);
			}
			return;
		}

		if (key.escape || (key.ctrl && input === 'c')) {
			onCancel();
			return;
		}

		if (input === 'd' || input === 'D') {
			if (sessions.length > 0 && onDelete) {
				const sessionToDelete = sessions[selectedIndex];
				onDelete(sessionToDelete.id);
				refreshSessions();
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
		}
	});

	if (sessions.length === 0) {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color="cyan" bold>
						No Saved Sessions
					</Text>
				</Box>
				<Text color="gray">Sessions are auto-saved when you use /new</Text>
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						Press ESC to close
					</Text>
				</Box>
			</Box>
		);
	}

	const formatDate = (timestamp: number): string => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	};

	const halfVisible = Math.floor(VISIBLE_ITEM_COUNT / 2);
	const startIndex = Math.max(0, selectedIndex - halfVisible);
	const endIndex = Math.min(sessions.length, startIndex + VISIBLE_ITEM_COUNT);
	const adjustedStart = Math.max(0, endIndex - VISIBLE_ITEM_COUNT);
	const visibleSessions = sessions.slice(adjustedStart, endIndex);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					Select Session ({selectedIndex + 1}/{sessions.length})
				</Text>
			</Box>

			<Box flexDirection="column">
				{visibleSessions.map((session, index) => {
					const actualIndex = adjustedStart + index;
					const isSelected = actualIndex === selectedIndex;
					return (
						<Box key={session.id} flexDirection="column">
							<Box>
								<Text
									color={isSelected ? 'black' : 'white'}
									backgroundColor={isSelected ? 'cyan' : undefined}
									bold={isSelected}
								>
									{isSelected ? '>' : ' '} {session.name}
								</Text>
							</Box>
							{isSelected && (
								<Box marginLeft={2}>
									<Text color="gray" dimColor>
										{formatDate(session.timestamp)} • {session.messageCount}{' '}
										msgs • {formatTokenCount(session.totalTokens)} tokens •{' '}
										{session.provider}/{session.model}
									</Text>
								</Box>
							)}
						</Box>
					);
				})}
			</Box>

			{sessions.length > VISIBLE_ITEM_COUNT && (
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						↑/↓ to scroll
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text color="gray" dimColor>
					↵ select • D delete • ESC cancel
				</Text>
			</Box>
		</Box>
	);
}
