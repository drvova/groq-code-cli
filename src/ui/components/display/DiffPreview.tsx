import React from 'react';
import {Box, Text} from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import {
	validateReadBeforeEdit,
	getReadBeforeEditError,
} from '../../../tools/index.js';
import {
	generateUnifiedDiff,
	parseDiffIntoChunks,
	type DiffChunk,
} from './utils/diff-engine.js';

interface ToolArgs {
	old_text?: string;
	new_text?: string;
	replace_all?: boolean;
	content?: string;
	file_path?: string;
}

interface DiffPreviewProps {
	toolName: string;
	toolArgs: ToolArgs;
	isHistorical?: boolean;
}

export default function DiffPreview({
	toolName,
	toolArgs,
	isHistorical = false,
}: DiffPreviewProps) {
	const [diffChunks, setDiffChunks] = React.useState<DiffChunk[]>([]);
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		generateDiff();
	}, [toolName, toolArgs]);

	const generateDiff = async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (!isHistorical && toolName === 'edit_file' && toolArgs.file_path) {
				if (!validateReadBeforeEdit(toolArgs.file_path)) {
					setError(getReadBeforeEditError(toolArgs.file_path));
					return;
				}
			}

			const filePath = toolArgs.file_path;
			if (!filePath) {
				setError('No file path provided');
				return;
			}

			let reconstructedOriginal: string;
			let simulatedContent: string;

			if (isHistorical) {
				if (
					toolArgs.old_text !== undefined &&
					toolArgs.new_text !== undefined
				) {
					reconstructedOriginal = toolArgs.old_text;
					simulatedContent = toolArgs.new_text;
				} else if (toolArgs.content !== undefined) {
					reconstructedOriginal = '';
					simulatedContent = toolArgs.content;
				} else {
					reconstructedOriginal = '';
					simulatedContent = '';
				}
			} else {
				let originalContent = '';

				try {
					const resolvedPath = path.resolve(filePath);
					originalContent = await fs.promises.readFile(resolvedPath, 'utf-8');
				} catch (error) {
					// File doesn't exist or can't be read, use empty content
				}

				reconstructedOriginal = originalContent;

				if (
					toolArgs.old_text !== undefined &&
					toolArgs.new_text !== undefined
				) {
					if (!originalContent.includes(toolArgs.old_text)) {
						if (originalContent.includes(toolArgs.new_text)) {
							if (toolArgs.replace_all) {
								reconstructedOriginal = originalContent
									.split(toolArgs.new_text)
									.join(toolArgs.old_text);
							} else {
								reconstructedOriginal = originalContent.replace(
									toolArgs.new_text,
									toolArgs.old_text,
								);
							}
							simulatedContent = originalContent;
						} else {
							simulatedContent = originalContent;
						}
					} else {
						if (toolArgs.replace_all) {
							simulatedContent = originalContent
								.split(toolArgs.old_text)
								.join(toolArgs.new_text);
						} else {
							simulatedContent = originalContent.replace(
								toolArgs.old_text,
								toolArgs.new_text,
							);
						}
					}
				} else {
					simulatedContent = toolArgs.content || '';
				}
			}

			const diff = generateUnifiedDiff(
				reconstructedOriginal.split('\n'),
				simulatedContent.split('\n'),
				`${filePath} (original)`,
				`${filePath} (new)`,
				5,
			);

			setDiffChunks(diff.length === 0 ? [] : parseDiffIntoChunks(diff));
		} catch (err) {
			setError(`Error generating diff: ${err}`);
		} finally {
			setIsLoading(false);
		}
	};

	const renderDiffLine = (line: string, index: number) => {
		if (line.startsWith('+++') || line.startsWith('---')) {
			return (
				<Text key={index} bold color="blue">
					{line}
				</Text>
			);
		} else if (line.startsWith('@@')) {
			return (
				<Text key={index} color="cyan">
					{line}
				</Text>
			);
		} else if (line.startsWith('+')) {
			return (
				<Text key={index} backgroundColor="rgb(124, 214, 114)" color="black">
					+ {line.slice(1)}
				</Text>
			);
		} else if (line.startsWith('-')) {
			return (
				<Text key={index} backgroundColor="rgb(214, 114, 114)" color="black">
					- {line.slice(1)}
				</Text>
			);
		} else if (line.startsWith(' ')) {
			return (
				<Text key={index} dimColor>
					{'  ' + line.slice(1)}
				</Text>
			);
		} else {
			return (
				<Text key={index} dimColor>
					{line}
				</Text>
			);
		}
	};

	if (isLoading) {
		return (
			<Box>
				<Text color="yellow">Generating diff preview...</Text>
			</Box>
		);
	}

	if (error) {
		return (
			<Box>
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	if (diffChunks.length === 0) {
		return (
			<Box>
				<Text dimColor>No changes to show</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				Diff Preview:
			</Text>
			{diffChunks.map((chunk, chunkIndex) => (
				<Box
					key={chunkIndex}
					flexDirection="column"
					marginTop={chunkIndex > 0 ? 1 : 0}
				>
					{chunkIndex > 0 && <Text dimColor>...</Text>}
					{chunk.lines.map((line, lineIndex) =>
						renderDiffLine(line, lineIndex),
					)}
				</Box>
			))}
		</Box>
	);
}
