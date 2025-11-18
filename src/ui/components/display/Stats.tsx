import {Box, Text} from 'ink';
import {
	formatTime,
	formatNumber,
	formatPercentage,
} from './utils/formatting.js';

interface Usage {
	queue_time: number;
	prompt_tokens: number;
	prompt_time: number;
	completion_tokens: number;
	completion_time: number;
	total_tokens: number;
	total_requests?: number;
	total_time: number;
	prompt_tokens_details?: {
		cached_tokens: number;
	};
}

interface StatsProps {
	usage?: Usage;
}

export default function Stats({usage}: StatsProps) {
	const cachedTokens = usage?.prompt_tokens_details?.cached_tokens || 0;
	const promptTokens = usage?.prompt_tokens || 0;
	const cachedPercent = formatPercentage(cachedTokens, promptTokens);

	const stats = {
		totalRequests: usage?.total_requests || 0,
		processingTime: formatTime(usage?.total_time || 0),
		promptTokens: promptTokens,
		completionTokens: usage?.completion_tokens || 0,
		cachedTokens,
		cachedPercent,
	};

	return (
		<Box flexDirection="column" paddingX={1}>
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					▣ Session Stats
				</Text>
			</Box>

			<Box flexDirection="column" marginBottom={2}>
				<Box justifyContent="flex-start" marginBottom={1} paddingBottom={0}>
					<Text color="gray">Performance</Text>
				</Box>
				<Box flexDirection="row" justifyContent="center" gap={4}>
					<Box flexDirection="column" alignItems="center" paddingX={3}>
						<Text color="blue" bold>
							{stats.totalRequests}
						</Text>
						<Text color="gray" dimColor>
							Requests
						</Text>
					</Box>
					<Box flexDirection="column" alignItems="center" paddingX={3}>
						<Text color="yellow" bold>
							{stats.processingTime}
						</Text>
						<Text color="gray" dimColor>
							Response Time
						</Text>
					</Box>
				</Box>
			</Box>

			<Box flexDirection="column">
				<Box justifyContent="flex-start" marginBottom={1} paddingBottom={0}>
					<Text color="gray">Token Usage</Text>
				</Box>
				<Box flexDirection="row" justifyContent="center" gap={4}>
					<Box flexDirection="column" alignItems="center" paddingX={3}>
						<Text color="cyan" bold>
							{formatNumber(stats.promptTokens)}
						</Text>
						<Text color="gray" dimColor>
							Input Tokens
						</Text>
					</Box>
					<Box flexDirection="column" alignItems="center" paddingX={3}>
						<Text color="green" bold>
							{formatNumber(stats.completionTokens)}
						</Text>
						<Text color="gray" dimColor>
							Output Tokens
						</Text>
					</Box>
					{usage?.prompt_tokens_details && (
						<Box flexDirection="column" alignItems="center" paddingX={3}>
							<Text color="magenta" bold>
								{formatNumber(stats.cachedTokens)} ({stats.cachedPercent}%)
							</Text>
							<Text color="gray" dimColor>
								Cached
							</Text>
						</Box>
					)}
				</Box>
			</Box>
		</Box>
	);
}
