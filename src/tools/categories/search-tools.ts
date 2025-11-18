/**
 * Search Tools Category - Code search and navigation
 * Constitutional compliance: AMENDMENT IV - Clean search tools
 */

import * as fs from 'fs';
import * as path from 'path';
import {exec} from 'child_process';
import {promisify} from 'util';
import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse, ToolResult} from '../tools.js';
import {SEARCH_FILES_SCHEMA} from '../schemas/search-schemas.js';

// Helper interfaces for search results
interface SearchMatch {
	lineNumber: number;
	lineContent: string;
	contextLines?: string[];
	matchPositions: Array<{
		start: number;
		end: number;
		text: string;
	}>;
}

interface SearchResult {
	filePath: string;
	matches: SearchMatch[];
	totalMatches: number;
}

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search for text patterns in files with advanced filtering and matching options
 */
async function searchFiles(
	pattern: string,
	filePattern: string = '*',
	directory: string = '.',
	caseSensitive: boolean = false,
	patternType: 'substring' | 'regex' | 'exact' | 'fuzzy' = 'substring',
	fileTypes?: string[],
	excludeDirs?: string[],
	excludeFiles?: string[],
	maxResults: number = 100,
	contextLines: number = 0,
	groupByFile: boolean = false,
): Promise<ToolResult> {
	try {
		const searchDir = path.resolve(directory);

		// Check if directory exists
		const exists = await fs.promises
			.access(searchDir)
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

		const stats = await fs.promises.stat(searchDir);
		if (!stats.isDirectory()) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: Path is not a directory',
			);
		}

		// Build ripgrep command
		const rgArgs: string[] = [];

		// Case sensitivity
		if (!caseSensitive) {
			rgArgs.push('-i');
		}

		// Context lines
		if (contextLines > 0) {
			rgArgs.push(`-C${contextLines}`);
		}

		// Line numbers
		rgArgs.push('-n');

		// JSON output for easier parsing
		rgArgs.push('--json');

		// Max count
		rgArgs.push(`-m${maxResults}`);

		// Default exclusions
		const defaultExcludeDirs = [
			'node_modules',
			'.git',
			'.next',
			'dist',
			'build',
			'.cache',
		];
		const finalExcludeDirs = [...defaultExcludeDirs, ...(excludeDirs || [])];

		for (const dir of finalExcludeDirs) {
			rgArgs.push('-g', `!${dir}/**`);
		}

		// Exclude files
		if (excludeFiles && excludeFiles.length > 0) {
			for (const file of excludeFiles) {
				rgArgs.push('-g', `!${file}`);
			}
		}

		// File types
		if (fileTypes && fileTypes.length > 0) {
			for (const type of fileTypes) {
				rgArgs.push('-t', type);
			}
		} else if (filePattern !== '*') {
			rgArgs.push('-g', filePattern);
		}

		// Pattern type handling
		let searchPattern = pattern;
		if (patternType === 'exact') {
			rgArgs.push('-F'); // Fixed string (literal)
			searchPattern = pattern;
		} else if (patternType === 'regex') {
			// Ripgrep uses regex by default
			searchPattern = pattern;
		} else if (patternType === 'fuzzy') {
			// Convert to regex pattern with .* between chars
			searchPattern = pattern
				.split('')
				.map(c => escapeRegex(c))
				.join('.*');
		} else {
			// Substring - use fixed string
			rgArgs.push('-F');
			searchPattern = pattern;
		}

		// Add pattern and directory
		rgArgs.push(searchPattern, searchDir);

		// Execute ripgrep
		const execAsync = promisify(exec);
		const command = `rg ${rgArgs
			.map(arg => {
				// Escape arguments for shell
				if (arg.includes(' ') || arg.includes('*') || arg.includes('?')) {
					return `'${arg.replace(/'/g, "'\\''")}'`;
				}
				return arg;
			})
			.join(' ')}`;

		let result: {stdout: string; stderr: string};
		try {
			result = await execAsync(command, {
				cwd: process.cwd(),
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
			});
		} catch (error: any) {
			// ripgrep returns exit code 1 when no matches found (not an error)
			if (error.code === 1) {
				result = {stdout: error.stdout || '', stderr: error.stderr || ''};
			} else {
				throw new Error(`ripgrep failed: ${error.message}`);
			}
		}

		// Parse JSON output
		const lines = result.stdout
			.trim()
			.split('\n')
			.filter(l => l);
		const results: SearchResult[] = [];
		const fileMap = new Map<string, SearchMatch[]>();

		for (const line of lines) {
			try {
				const entry = JSON.parse(line);

				if (entry.type === 'match') {
					const data = entry.data;
					const filePath = path.relative(process.cwd(), data.path.text);
					const lineNumber = data.line_number;
					const lineContent = data.lines.text.trimEnd();

					const match: SearchMatch = {
						lineNumber,
						lineContent,
						matchPositions: data.submatches.map((sm: any) => ({
							start: sm.start,
							end: sm.end,
							text: lineContent.substring(sm.start, sm.end),
						})),
					};

					if (!fileMap.has(filePath)) {
						fileMap.set(filePath, []);
					}
					fileMap.get(filePath)!.push(match);
				}
			} catch (e) {
				// Skip invalid JSON lines
				continue;
			}
		}

		// Convert to results format
		for (const [filePath, matches] of fileMap.entries()) {
			results.push({
				filePath,
				matches,
				totalMatches: matches.length,
			});
		}

		// Format results
		let formattedResults: any;
		if (groupByFile) {
			formattedResults = results;
		} else {
			formattedResults = results.flatMap(fileResult =>
				fileResult.matches.map(match => ({
					filePath: fileResult.filePath,
					lineNumber: match.lineNumber,
					lineContent: match.lineContent,
					matchPositions: match.matchPositions,
				})),
			);
		}

		const totalMatches = results.reduce((sum, r) => sum + r.totalMatches, 0);
		const message = `Found ${totalMatches} match(es) in ${results.length} file(s)`;
		return createToolResponse(true, formattedResults, message);
	} catch (error) {
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: ${
				error instanceof Error ? error.message : 'Failed to search files'
			}`,
		);
	}
}

// Executors
async function searchFilesExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {
		pattern,
		file_pattern,
		directory,
		case_sensitive,
		pattern_type,
		file_types,
		exclude_dirs,
		exclude_files,
		max_results,
		context_lines,
		group_by_file,
	} = args;

	try {
		const result = await searchFiles(
			pattern,
			file_pattern,
			directory,
			case_sensitive,
			pattern_type,
			file_types,
			exclude_dirs,
			exclude_files,
			max_results,
			context_lines,
			group_by_file,
		);
		return result;
	} catch (error) {
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to search files: ${error}`,
		);
	}
}

// Register all search tools
export function registerSearchTools(): void {
	ToolRegistry.registerTool(SEARCH_FILES_SCHEMA, searchFilesExecutor, 'safe');
}
