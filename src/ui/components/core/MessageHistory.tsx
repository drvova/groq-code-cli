import React, {useEffect, useRef, useState} from 'react';
import {Box, Text} from 'ink';
import {createHighlighter, type Highlighter} from 'shiki';
import {ChatMessage} from '../../hooks/useAgent.js';
import ToolHistoryItem from '../display/ToolHistoryItem.js';
import Stats from '../display/Stats.js';
import {formatTimestamp} from '../display/utils/formatting.js';
import MarkdownRenderer from '../display/MarkdownRenderer.js';

interface Usage {
	queue_time: number;
	prompt_tokens: number;
	prompt_time: number;
	completion_tokens: number;
	completion_time: number;
	total_tokens: number;
	total_requests?: number;
	total_time: number;
}

interface MessageHistoryProps {
	messages: ChatMessage[];
	showReasoning?: boolean;
	usageData?: Usage;
	scrollOffset?: number;
}

export default function MessageHistory({
	messages,
	showReasoning = true,
	usageData,
	scrollOffset = 0,
}: MessageHistoryProps) {
	const scrollRef = useRef<any>(null);
	const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

	// Initialize Shiki highlighter
	useEffect(() => {
		createHighlighter({
			themes: ['dark-plus'],
			langs: [
				'javascript',
				'typescript',
				'python',
				'java',
				'cpp',
				'c',
				'go',
				'rust',
				'php',
				'ruby',
				'html',
				'css',
				'sql',
				'yaml',
				'xml',
				'bash',
				'powershell',
				'json',
				'markdown',
				'dockerfile',
				'diff',
				'text',
			],
		}).then(setHighlighter);
	}, []);

	// Auto-scroll to bottom when new messages are added or when scrolling simulated history
	useEffect(() => {
		if (scrollRef.current && typeof scrollRef.current.scrollToBottom === 'function') {
			scrollRef.current.scrollToBottom();
		}
	}, [messages.length, scrollOffset]);

	const renderMessage = (message: ChatMessage) => {
		const timestamp = formatTimestamp(message.timestamp);

		switch (message.role) {
			case 'user':
				return (
					<Box key={message.id} marginBottom={1}>
						<Text color="cyan" bold>
							{'>'}{' '}
						</Text>
						<Text color="gray">{message.content}</Text>
					</Box>
				);

			case 'assistant':
				return (
					<Box key={message.id} marginBottom={1} flexDirection="column">
						{/* Render reasoning if present and showReasoning is enabled */}
						{message.reasoning && showReasoning && (
							<Box marginBottom={1}>
								<Text italic dimColor>
									{message.reasoning}
								</Text>
							</Box>
						)}
						{/* Render content only if it exists */}
						{message.content && (
							<MarkdownRenderer
								content={message.content}
								highlighter={highlighter}
							/>
						)}
					</Box>
				);

			case 'system':
				// Handle special system message types
				if (message.type === 'stats') {
					return (
						<Box key={message.id} marginBottom={1}>
							<Stats usage={message.usageSnapshot || usageData} />
						</Box>
					);
				}

				return (
					<Box key={message.id} marginBottom={1}>
						<Text color="yellow" italic>
							{message.content}
						</Text>
					</Box>
				);

			case 'tool_execution':
				if (message.toolExecution) {
					return (
						<Box key={message.id} marginBottom={1}>
							<ToolHistoryItem execution={message.toolExecution} />
						</Box>
					);
				}
				return (
					<Box key={message.id} marginBottom={1}>
						<Text color="blue">Tool: {message.content}</Text>
					</Box>
				);

			default:
				return (
					<Box key={message.id} marginBottom={1}>
						<Text color="gray" dimColor>
							Unknown: {message.content}
						</Text>
					</Box>
				);
		}
	};

	const visibleMessages =
		scrollOffset > 0
			? messages.slice(0, messages.length - scrollOffset)
			: messages;

	return (
		<Box ref={scrollRef} flexDirection="column" flexGrow={1} overflow="hidden">
			{messages.length === 0 ? (
				<Box
					justifyContent="center"
					paddingY={2}
					flexDirection="column"
					alignItems="center"
				>
					<Text color="gray" dimColor italic>
						Ask for help with coding tasks, debugging issues, or explaining
						code.
					</Text>
					<Text color="gray" dimColor italic>
						Type /help for available commands and features.
					</Text>
				</Box>
			) : (
				<>
					{visibleMessages.map(renderMessage)}
					{scrollOffset > 0 && (
						<Box borderStyle="single" borderColor="yellow" paddingX={1}>
							<Text color="yellow">
								↓ History View ({scrollOffset} newer messages hidden)
							</Text>
						</Box>
					)}
				</>
			)}
		</Box>
	);
}
