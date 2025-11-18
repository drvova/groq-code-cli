import {ToolSchema} from '../registry/tool-registry.js';

export const READ_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'read_file',
		description:
			'Read file contents with optional line range. REQUIRED before edit_file. Use to check if files exist and examine current code before making changes. Example: {"file_path": "src/app.js", "start_line": 10, "end_line": 20}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path to file. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
				start_line: {
					type: 'integer',
					description: 'Starting line number (1-indexed, optional)',
					minimum: 1,
				},
				end_line: {
					type: 'integer',
					description: 'Ending line number (1-indexed, optional)',
					minimum: 1,
				},
			},
			required: ['file_path'],
		},
	},
};

export const CREATE_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'create_file',
		description:
			'Create NEW files or directories that DO NOT EXIST. CRITICAL: Always check if file exists first using list_files or read_file before creating. If file exists, use edit_file instead. Set overwrite=true only if you explicitly need to replace existing content. Example: {"file_path": "src/utils/new-helper.js", "content": "function helper() { return true; }", "file_type": "file"}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path for new file/directory. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
				content: {
					type: 'string',
					description: 'File content (use empty string "" for directories)',
				},
				file_type: {
					type: 'string',
					enum: ['file', 'directory'],
					description: 'Create file or directory',
					default: 'file',
				},
				overwrite: {
					type: 'boolean',
					description: 'Overwrite existing file',
					default: false,
				},
			},
			required: ['file_path', 'content'],
		},
	},
};

export const EDIT_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'edit_file',
		description:
			'Modify EXISTING files by exact text replacement. Use this for files that already exist. MANDATORY: Always read_file first to see current content before editing. Text must match exactly including whitespace. Example: {"file_path": "src/app.js", "old_text": "const x = 1;", "new_text": "const x = 2;"}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path to file to edit. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
				old_text: {
					type: 'string',
					description:
						'Exact text to replace (must match perfectly including spaces/newlines)',
				},
				new_text: {
					type: 'string',
					description: 'Replacement text',
				},
				replace_all: {
					type: 'boolean',
					description: 'Replace all occurrences (default: false)',
					default: false,
				},
			},
			required: ['file_path', 'old_text', 'new_text'],
		},
	},
};

export const DELETE_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'delete_file',
		description:
			'Remove files or directories. Use with caution. Example: {"file_path": "temp/old_file.txt"} or {"file_path": "temp_dir", "recursive": true}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path to file/directory to delete. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
				recursive: {
					type: 'boolean',
					description: 'Delete directories and their contents',
					default: false,
				},
			},
			required: ['file_path'],
		},
	},
};

export const LIST_FILES_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'list_files',
		description:
			'Browse directory contents and file structure. Use to explore project layout and CHECK IF FILES EXIST before deciding between create_file vs edit_file. Example: {"directory": "src", "pattern": "*.js", "recursive": true}',
		parameters: {
			type: 'object',
			properties: {
				directory: {
					type: 'string',
					description:
						'Directory path to list. Use "." or "" for current directory, "src" for subdirectory. DO NOT include leading slash.',
					default: '.',
				},
				pattern: {
					type: 'string',
					description: 'File pattern filter ("*.py", "test_*", etc.)',
					default: '*',
				},
				recursive: {
					type: 'boolean',
					description: 'List subdirectories recursively',
					default: false,
				},
				show_hidden: {
					type: 'boolean',
					description: 'Include hidden files (.gitignore, .env, etc.)',
					default: false,
				},
			},
			required: [],
		},
	},
};
