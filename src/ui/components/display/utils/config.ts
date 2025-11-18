/**
 * Display component configuration constants
 * Constitutional compliance: AMENDMENT I - Avoid Hardcoding
 */

export const DISPLAY_CONFIG = {
	// MCP Status refresh interval (ms)
	MCP_REFRESH_INTERVAL: 2000,

	// TokenMetrics update intervals (ms)
	TOKEN_DISPLAY_UPDATE: 100,
	TOKEN_ANIMATION_CYCLE: 2000,

	// Diff engine context lines
	DIFF_CONTEXT_LINES: 5,

	// Loading animations
	LOADING_ANIMATIONS: ['█▓▒░', '▓▒░█', '▒░█▓', '░█▓▒'],
} as const;
