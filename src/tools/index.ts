/**
 * Tools Module - Main entry point for tool system
 * Constitutional compliance: AMENDMENT III - Single Source of Truth
 */

export {ToolRegistry, ToolSchema, ToolCategory} from './registry/tool-registry.js';
export {initializeAllTools} from './categories/index.js';

// Export legacy functions for backward compatibility during transition
export {
	getReadFilesTracker,
	formatToolParams,
	createToolResponse,
} from './tools.js';

// Re-export ToolResult type
export type {ToolResult} from './tools.js';
