/**
 * Centralized formatting utilities for display components
 * Constitutional compliance: AMENDMENT III - Single Source of Truth
 */

/**
 * Format time duration in seconds to human-readable string
 */
export function formatTime(seconds: number): string {
	if (seconds < 1) {
		return `${(seconds * 1000).toFixed(0)}ms`;
	}

	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

/**
 * Format large numbers with locale-specific thousands separators
 */
export function formatNumber(value: number): string {
	return value.toLocaleString();
}

/**
 * Calculate percentage with specified decimal places
 */
export function formatPercentage(
	value: number,
	total: number,
	decimals: number = 1,
): string {
	if (total === 0) return '0';
	return ((value / total) * 100).toFixed(decimals);
}

/**
 * Format token count with K/M suffixes for readability
 */
export function formatTokenCount(tokens: number): string {
	if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
	if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
	return tokens.toString();
}

/**
 * Format date as timestamp string
 */
export function formatTimestamp(date: Date): string {
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}
