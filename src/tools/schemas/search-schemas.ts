import {ToolSchema} from '../registry/tool-registry.js';

export const SEARCH_FILES_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'search_files',
		description:
			'Find text patterns in files across the codebase. Perfect for locating functions, classes, or specific code. Example: {"pattern": "function handleClick", "file_pattern": "*.js", "context_lines": 3}',
		parameters: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description:
						'Text to search for (can be function names, classes, strings, etc.)',
				},
				file_pattern: {
					type: 'string',
					description: 'File pattern filter (e.g., "*.py", "*.js", "src/*.ts")',
					default: '*',
				},
				directory: {
					type: 'string',
					description:
						'Directory to search in. Use "." or "" for current directory, "src" for subdirectory. DO NOT include leading slash.',
					default: '.',
				},
				case_sensitive: {
					type: 'boolean',
					description: 'Case-sensitive search',
					default: false,
				},
				pattern_type: {
					type: 'string',
					enum: ['substring', 'regex', 'exact', 'fuzzy'],
					description:
						'Match type: substring (partial), regex (patterns), exact (whole), fuzzy (similar)',
					default: 'substring',
				},
				file_types: {
					type: 'array',
					items: {type: 'string'},
					description: 'File extensions to include (["py", "js", "ts"])',
				},
				exclude_dirs: {
					type: 'array',
					items: {type: 'string'},
					description: 'Directories to skip (["node_modules", ".git", "dist"])',
				},
				exclude_files: {
					type: 'array',
					items: {type: 'string'},
					description: 'File patterns to skip (["*.min.js", "*.log"])',
				},
				max_results: {
					type: 'integer',
					description: 'Maximum results to return (1-1000)',
					default: 100,
					minimum: 1,
					maximum: 1000,
				},
				context_lines: {
					type: 'integer',
					description: 'Lines of context around matches (0-10)',
					default: 0,
					minimum: 0,
					maximum: 10,
				},
				group_by_file: {
					type: 'boolean',
					description: 'Group results by filename',
					default: false,
				},
			},
			required: ['pattern'],
		},
	},
};
