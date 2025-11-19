/**
 * LSP Tool Schemas - Schema definitions for LSP diagnostic tools
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for LSP tool schemas
 */

import {ToolSchema} from '../registry/tool-registry.js';

export const DETECT_LSP_SERVERS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'detect_lsp_servers',
		description:
			'Auto-detect available Language Server Protocol (LSP) servers installed on the system. Scans system PATH for TypeScript, Python, Rust, Go, and other language servers. Returns available servers with their versions, paths, and supported languages.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
};

export const START_LSP_DIAGNOSTICS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'start_lsp_diagnostics',
		description:
			'Start LSP diagnostics engine for real-time code analysis. Automatically detects and launches the appropriate language server for the workspace. Enables real-time error detection, warnings, and code intelligence.',
		parameters: {
			type: 'object',
			properties: {
				workspace_path: {
					type: 'string',
					description:
						'Path to the workspace root directory. Defaults to current directory.',
				},
				server: {
					type: 'string',
					description:
						'Specific LSP server command to use (e.g., "typescript-language-server"). If not provided, auto-detects based on workspace.',
				},
			},
			required: [],
		},
	},
};

export const STOP_LSP_DIAGNOSTICS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'stop_lsp_diagnostics',
		description:
			'Stop the running LSP diagnostics engine and clean up resources.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
};

export const ANALYZE_LSP_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'analyze_lsp_file',
		description:
			'Analyze a specific file using LSP diagnostics. Returns errors, warnings, and informational messages with line numbers and detailed descriptions. Must have LSP diagnostics running first.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the file to analyze',
				},
			},
			required: ['file_path'],
		},
	},
};

export const GET_LSP_DIAGNOSTICS_SUMMARY_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'get_lsp_diagnostics_summary',
		description:
			'Get a comprehensive summary of all LSP diagnostics across the workspace. Returns total counts of errors, warnings, info messages, and lists all files with issues. Must have LSP diagnostics running first.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
};

export const ANALYZE_WORKSPACE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'analyze_workspace',
		description:
			'Analyze entire workspace or directory with LSP diagnostics. Automatically starts LSP server if not running. Scans all matching files and returns comprehensive diagnostics. Use this for project-wide code quality analysis.',
		parameters: {
			type: 'object',
			properties: {
				directory: {
					type: 'string',
					description:
						'Directory to analyze. Defaults to current working directory.',
				},
				pattern: {
					type: 'string',
					description:
						'Glob pattern for files to analyze (e.g., "**/*.ts"). Defaults to "**/*.{ts,tsx,js,jsx}"',
				},
			},
			required: [],
		},
	},
};

export const GET_FILES_WITH_ERRORS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'get_files_with_errors',
		description:
			'Get a list of all files that have LSP errors. Useful for identifying files that need attention. Must have LSP diagnostics running first.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
};
