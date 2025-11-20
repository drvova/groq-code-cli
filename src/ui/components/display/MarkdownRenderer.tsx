import React from 'react';
import {Box, Text} from 'ink';
import chalk from 'chalk';
import {type Highlighter} from 'shiki';
import {
	parseMarkdown,
	parseInlineElements,
} from '../../../utils/markdown.js';

interface MarkdownRendererProps {
	content: string;
	highlighter: Highlighter | null;
}

export default function MarkdownRenderer({content, highlighter}: MarkdownRendererProps) {
	const markdownElements = parseMarkdown(content);

	return (
		<Box flexDirection="column">
			{markdownElements.map((element, index) => {
				switch (element.type) {
					case 'code-block':
						if (highlighter && element.language) {
							const tokens = highlighter.codeToTokens(element.content, {
								lang: (element.language || 'text') as any,
								theme: 'dark-plus',
							});
							const highlighted = tokens.tokens
								.map((line: any) =>
									line
										.map((token: any) =>
											chalk.hex(token.color || '#cccccc')(
												token.content,
											),
										)
										.join(''),
								)
								.join('\n');
							return (
								<Box key={index} marginY={1} paddingLeft={2}>
									<Text>{highlighted}</Text>
								</Box>
							);
						} else {
							return (
								<Box key={index} marginY={1} paddingLeft={2}>
									<Text color="cyan">{element.content}</Text>
								</Box>
							);
						}
					case 'heading':
						return (
							<Text
								key={index}
								bold
								color={
									element.level && element.level <= 2
										? 'yellow'
										: 'white'
								}
							>
								{element.content}
							</Text>
						);
					case 'mixed-line':
						const inlineElements = parseInlineElements(element.content);
						return (
							<Text key={index}>
								{inlineElements.map((inlineElement, inlineIndex) => {
									switch (inlineElement.type) {
										case 'code':
											return (
												<Text key={inlineIndex} color="cyan">
													{inlineElement.content}
												</Text>
											);
										case 'bold':
											return (
												<Text key={inlineIndex} bold>
													{inlineElement.content}
												</Text>
											);
										case 'italic':
											return (
												<Text key={inlineIndex} italic>
													{inlineElement.content}
												</Text>
											);
										default:
											return (
												<Text key={inlineIndex}>
													{inlineElement.content}
												</Text>
											);
									}
								})}
							</Text>
						);
					default:
						return <Text key={index}>{element.content}</Text>;
				}
			})}
		</Box>
	);
}
