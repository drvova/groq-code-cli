import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {DISPLAY_CONFIG} from './utils/config.js';

interface TokenMetricsProps {
	isActive: boolean;
	isPaused: boolean;
	startTime: Date | null;
	endTime: Date | null;
	pausedTime: number;
	completionTokens: number;
}

export default function TokenMetrics({
	isActive,
	isPaused,
	startTime,
	endTime,
	pausedTime,
	completionTokens,
}: TokenMetricsProps) {
	const [displayTime, setDisplayTime] = useState('0.0s');
	const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

	// Update the display time every 100ms when active and not paused
	useEffect(() => {
		if (!isActive || isPaused) {
			return;
		}

		const updateDisplay = () => {
			if (!startTime) {
				setDisplayTime('0.0s');
				return;
			}

			const currentElapsed = Date.now() - startTime.getTime() - pausedTime;
			setDisplayTime(
				`${(currentElapsed / DISPLAY_CONFIG.MS_PER_SECOND).toFixed(1)}s`,
			);
		};

		updateDisplay();

		const interval = setInterval(
			updateDisplay,
			DISPLAY_CONFIG.TOKEN_DISPLAY_UPDATE,
		);
		return () => clearInterval(interval);
	}, [isActive, isPaused, startTime, pausedTime]);

	// Reset loading message index when becoming active and not paused
	useEffect(() => {
		if (isActive && !isPaused) {
			setLoadingMessageIndex(0);
		}
	}, [isActive, isPaused]);

	// Cycle through loading messages every 2 seconds when active and not paused
	useEffect(() => {
		if (!isActive || isPaused) {
			return;
		}

		const interval = setInterval(() => {
			setLoadingMessageIndex(
				prevIndex => (prevIndex + 1) % DISPLAY_CONFIG.LOADING_ANIMATIONS.length,
			);
		}, DISPLAY_CONFIG.TOKEN_ANIMATION_CYCLE);

		return () => clearInterval(interval);
	}, [isActive, isPaused]);

	useEffect(() => {
		if (!isActive && endTime && startTime) {
			const finalElapsed = endTime.getTime() - startTime.getTime() - pausedTime;
			setDisplayTime(
				`${(finalElapsed / DISPLAY_CONFIG.MS_PER_SECOND).toFixed(1)}s`,
			);
		}
	}, [isActive, endTime, startTime, pausedTime]);

	const getElapsedTime = (): string => {
		return displayTime;
	};

	const getStatusText = (): string => {
		if (isPaused) return '▌▌ Waiting for approval...';
		if (isActive)
			return `◈ ${DISPLAY_CONFIG.LOADING_ANIMATIONS[loadingMessageIndex]}...`;
		return '';
	};

	// Don't show component if inactive and no tokens counted
	if (!isActive && completionTokens === 0) {
		return null;
	}

	return (
		<Box paddingX={1}>
			<Box gap={2}>
				<Text color="cyan">{getElapsedTime()}</Text>
				<Text color="green">{completionTokens} tokens</Text>
				{(isActive || isPaused) && (
					<Text color={isPaused ? 'yellow' : 'blue'}>{getStatusText()}</Text>
				)}
			</Box>
		</Box>
	);
}
