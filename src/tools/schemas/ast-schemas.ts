/**
 * AST Tool Schemas - Schema definitions for AST analysis tools
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for AST tool schemas
 */

import {ToolSchema} from '../registry/tool-registry.js';

export const GET_AST_TREE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'get_ast_tree',
		description:
			'Get the Abstract Syntax Tree structure of a TypeScript/JavaScript file. Returns hierarchical node structure with syntax kinds, positions, and names.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the TypeScript or JavaScript file to analyze',
				},
			},
			required: ['file_path'],
		},
	},
};

export const EXTRACT_SYMBOLS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'extract_code_symbols',
		description:
			'Extract all code symbols (functions, classes, interfaces, variables) from a file. Returns symbol names, types, locations, reference counts, and export status.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the file to extract symbols from',
				},
			},
			required: ['file_path'],
		},
	},
};

export const BUILD_DEPENDENCY_GRAPH_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'build_dependency_graph',
		description:
			'Build a dependency graph showing import relationships between files in a directory. Returns nodes (files) and edges (import relationships).',
		parameters: {
			type: 'object',
			properties: {
				directory_path: {
					type: 'string',
					description: 'Path to the directory to analyze',
				},
			},
			required: ['directory_path'],
		},
	},
};

export const CALCULATE_COMPLEXITY_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'calculate_code_complexity',
		description:
			'Calculate code complexity metrics including cyclomatic complexity, cognitive complexity, lines of code, and maintainability index.',
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

export const FIND_UNUSED_EXPORTS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'find_unused_exports',
		description:
			'Find exported symbols that are not referenced outside their defining file. Useful for identifying dead code.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the file to check for unused exports',
				},
			},
			required: ['file_path'],
		},
	},
};

export const RENAME_SYMBOL_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'rename_symbol',
		description:
			'Rename a symbol (function, class, variable, etc.) across the entire project, updating all references.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the file containing the symbol',
				},
				old_name: {
					type: 'string',
					description: 'Current name of the symbol',
				},
				new_name: {
					type: 'string',
					description: 'New name for the symbol',
				},
			},
			required: ['file_path', 'old_name', 'new_name'],
		},
	},
};

export const EXTRACT_FUNCTION_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'extract_function',
		description:
			'Extract a function from one file to another, automatically updating imports and exports.',
		parameters: {
			type: 'object',
			properties: {
				source_file: {
					type: 'string',
					description: 'Path to the file containing the function',
				},
				function_name: {
					type: 'string',
					description: 'Name of the function to extract',
				},
				target_file: {
					type: 'string',
					description: 'Path to the target file where function should be moved',
				},
			},
			required: ['source_file', 'function_name', 'target_file'],
		},
	},
};

export const FIND_SYMBOL_REFERENCES_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'find_symbol_references',
		description:
			'Find all references to a specific symbol across the codebase. Returns file paths, line numbers, and context.',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'Path to the file containing the symbol',
				},
				symbol_name: {
					type: 'string',
					description: 'Name of the symbol to find references for',
				},
			},
			required: ['file_path', 'symbol_name'],
		},
	},
};

export const ANALYZE_IMPORTS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'analyze_imports',
		description:
			'Analyze import statements in a file. Returns imported modules, specific imports, and unused imports.',
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
