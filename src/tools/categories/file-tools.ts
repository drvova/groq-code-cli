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
} from '../tools.js';
import {
    READ_FILE_SCHEMA,
    CREATE_FILE_SCHEMA,
    EDIT_FILE_SCHEMA,
    DELETE_FILE_SCHEMA,
    LIST_FILES_SCHEMA
} from '../schemas/file-schemas.js';
import { deleteFile } from '../../utils/file-ops.js';

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
		const success = await deleteFile(file_path, true);
		
		if (success) {
			return createToolResponse(true, '', `Deleted ${file_path}`);
		} else {
			return createToolResponse(false, undefined, '', `Error: Failed to delete ${file_path} (file may not exist)`);
		}
	} catch (error) {
		const err = error as Error;
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
