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
 * Format date as timestamp string (HH:MM)
 */
export function formatTimestamp(date: Date): string {
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

/**
 * Format timestamp as relative time (e.g., "5m ago", "2h ago", "3d ago")
 */
export function formatRelativeDate(timestamp: number): string {
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
}
