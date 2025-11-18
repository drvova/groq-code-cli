/**
 * File Tools Category - File system operations
 * Constitutional compliance: AMENDMENT IV - Clean, simple file operations
 */

import fs from 'fs';
import path from 'path';
import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {
	getReadFilesTracker,
	createToolResponse,
	formatToolParams,
} from '../tools.js';
import {ToolResult} from '../tools.js';

// Schemas
const READ_FILE_SCHEMA: ToolSchema = {
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

const CREATE_FILE_SCHEMA: ToolSchema = {
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

const EDIT_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'edit_file',
		description:
			'Edit EXISTING files by replacing old text with new text. CRITICAL: MUST call read_file first to check file contents. Text matching is EXACT (whitespace matters). If match fails, try with more context or different text. Example: {"file_path": "src/app.js", "old_text": "const x = 1;", "new_text": "const x = 2;"}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path to existing file. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
				old_text: {
					type: 'string',
					description:
						'EXACT text to find (must match exactly including whitespace)',
				},
				new_text: {
					type: 'string',
					description: 'Text to replace with',
				},
			},
			required: ['file_path', 'old_text', 'new_text'],
		},
	},
};

const DELETE_FILE_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'delete_file',
		description:
			'Delete files or directories. Use with caution. For directories, all contents will be recursively deleted. Example: {"file_path": "src/old-module.js"}',
		parameters: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'Path to file/directory to delete. For files in current directory use just filename (e.g. "app.js"). For subdirectories use "src/app.js". DO NOT use absolute paths or leading slashes.',
				},
			},
			required: ['file_path'],
		},
	},
};

const LIST_FILES_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'list_files',
		description:
			'List files and directories. Use to explore project structure or check if files exist before creating/editing. Returns file names, types, sizes. Example: {"directory": "src", "pattern": "*.js"}',
		parameters: {
			type: 'object',
			properties: {
				directory: {
					type: 'string',
					description:
						'Directory to list (default: current directory). Use "." for current dir, "src" for subdirectory.',
					default: '.',
				},
				pattern: {
					type: 'string',
					description:
						'Glob pattern to filter files (e.g., "*.js", "**/*.ts"). Uses glob syntax.',
				},
				recursive: {
					type: 'boolean',
					description: 'Include subdirectories recursively',
					default: false,
				},
			},
			required: [],
		},
	},
};

// Executors
async function readFileExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path, start_line, end_line} = args;
	const readFiles = getReadFilesTracker();

	try {
		const resolvedPath = path.resolve(file_path);

		try {
			await fs.promises.access(resolvedPath);
		} catch {
			return createToolResponse(false, undefined, '', 'Error: File not found');
		}

		const stats = await fs.promises.stat(resolvedPath);
		if (!stats.isFile()) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: Path is not a file',
			);
		}

		if (stats.size > 50 * 1024 * 1024) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: File too large (max 50MB)',
			);
		}

		const content = await fs.promises.readFile(resolvedPath, 'utf-8');
		const lines = content.split('\n');

		if (start_line !== undefined) {
			const startIdx = Math.max(0, start_line - 1);
			let endIdx = lines.length;

			if (end_line !== undefined) {
				endIdx = Math.min(lines.length, end_line);
			}

			if (startIdx >= lines.length) {
				return createToolResponse(
					false,
					undefined,
					'',
					'Error: Start line exceeds file length',
				);
			}

			const selectedLines = lines.slice(startIdx, endIdx);
			const selectedContent = selectedLines.join('\n');
			readFiles.add(resolvedPath);
			const message = `Read lines ${start_line}-${endIdx} from ${file_path}`;

			return createToolResponse(true, selectedContent, message);
		} else {
			readFiles.add(resolvedPath);
			const message = `Read ${lines.length} lines from ${file_path}`;
			return createToolResponse(true, content, message);
		}
	} catch (error) {
		const err = error as NodeJS.ErrnoException;

		switch (err.code) {
			case 'ENOENT':
				return createToolResponse(
					false,
					undefined,
					'',
					'Error: File not found',
				);
			case 'EACCES':
			case 'EPERM':
				return createToolResponse(
					false,
					undefined,
					'',
					`Error: Permission denied reading ${file_path}`,
				);
			case 'EISDIR':
				return createToolResponse(
					false,
					undefined,
					'',
					`Error: ${file_path} is a directory, not a file`,
				);
			case 'EMFILE':
			case 'ENFILE':
				return createToolResponse(
					false,
					undefined,
					'',
					'Error: Too many open files (system limit reached)',
				);
			default:
				return createToolResponse(
					false,
					undefined,
					'',
					`Error: Failed to read file: ${err.message || 'Unknown error'}`,
				);
		}
	}
}

async function createFileExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path, content, file_type = 'file', overwrite = false} = args;

	try {
		const resolvedPath = path.resolve(file_path);
		const fileExists = await fs.promises
			.access(resolvedPath)
			.then(() => true)
			.catch(() => false);

		if (fileExists && !overwrite) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: File ${file_path} already exists. Use edit_file to modify or set overwrite=true.`,
			);
		}

		if (file_type === 'directory') {
			await fs.promises.mkdir(resolvedPath, {recursive: true});
			return createToolResponse(true, '', `Created directory ${file_path}`);
		} else {
			const dir = path.dirname(resolvedPath);
			await fs.promises.mkdir(dir, {recursive: true});
			await fs.promises.writeFile(resolvedPath, content, 'utf-8');
			const lines = content.split('\n').length;
			return createToolResponse(
				true,
				'',
				`Created file ${file_path} with ${lines} lines`,
			);
		}
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to create file: ${err.message}`,
		);
	}
}

async function editFileExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path, old_text, new_text} = args;

	try {
		const resolvedPath = path.resolve(file_path);
		const content = await fs.promises.readFile(resolvedPath, 'utf-8');

		if (!content.includes(old_text)) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not find exact match for old_text in ${file_path}. Text matching is exact - check whitespace.`,
			);
		}

		const updatedContent = content.replace(old_text, new_text);
		await fs.promises.writeFile(resolvedPath, updatedContent, 'utf-8');

		return createToolResponse(true, '', `Edited ${file_path} - replaced text`);
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to edit file: ${err.message}`,
		);
	}
}

async function deleteFileExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const resolvedPath = path.resolve(file_path);
		const stats = await fs.promises.stat(resolvedPath);

		if (stats.isDirectory()) {
			await fs.promises.rm(resolvedPath, {recursive: true, force: true});
			return createToolResponse(
				true,
				'',
				`Deleted directory ${file_path} and all contents`,
			);
		} else {
			await fs.promises.unlink(resolvedPath);
			return createToolResponse(true, '', `Deleted file ${file_path}`);
		}
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to delete: ${err.message}`,
		);
	}
}

async function listFilesExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {directory = '.', pattern, recursive = false} = args;

	try {
		const resolvedDir = path.resolve(directory);

		// Check if directory exists
		const exists = await fs.promises
			.access(resolvedDir)
			.then(() => true)
			.catch(() => false);

		if (!exists) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: Directory not found',
			);
		}

		const stats = await fs.promises.stat(resolvedDir);
		if (!stats.isDirectory()) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: Path is not a directory',
			);
		}

		// Simple directory listing (non-recursive for now)
		const files = await fs.promises.readdir(resolvedDir);

		const fileInfo = await Promise.all(
			files.map(async (file: string) => {
				const fullPath = path.join(resolvedDir, file);
				const stats = await fs.promises.stat(fullPath);
				return {
					name: file,
					type: stats.isDirectory() ? 'directory' : 'file',
					size: stats.size,
				};
			}),
		);

		// Apply pattern filter if provided
		let filtered = fileInfo;
		if (pattern) {
			const regex = new RegExp(
				pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
			);
			filtered = fileInfo.filter(f => regex.test(f.name));
		}

		return createToolResponse(
			true,
			JSON.stringify(filtered, null, 2),
			`Listed ${filtered.length} items in ${directory}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to list files: ${err.message}`,
		);
	}
}

// Register all file tools
export function registerFileTools(): void {
	ToolRegistry.registerTool(READ_FILE_SCHEMA, readFileExecutor, 'safe');
	ToolRegistry.registerTool(
		CREATE_FILE_SCHEMA,
		createFileExecutor,
		'approval_required',
	);
	ToolRegistry.registerTool(
		EDIT_FILE_SCHEMA,
		editFileExecutor,
		'approval_required',
	);
	ToolRegistry.registerTool(
		DELETE_FILE_SCHEMA,
		deleteFileExecutor,
		'dangerous',
	);
	ToolRegistry.registerTool(LIST_FILES_SCHEMA, listFilesExecutor, 'safe');
}
