/**
 * Search Tools Category - Code search operations
 * Constitutional compliance: AMENDMENT IV - Simple, efficient search
 */

import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

// Schema
const SEARCH_FILES_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'search_files',
		description:
			'Search for text patterns in files using ripgrep. Powerful for finding code across project. Supports regex patterns. Example: {"pattern": "function.*login", "file_pattern": "*.ts", "case_sensitive": true}',
		parameters: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description:
						'Text or regex pattern to search for. Use plain text for simple searches, regex for complex patterns.',
				},
				file_pattern: {
					type: 'string',
					description:
						'Glob pattern to filter files (e.g., "*.js", "*.{ts,tsx}"). Optional.',
				},
				directory: {
					type: 'string',
					description: 'Directory to search in (default: current directory)',
					default: '.',
				},
				case_sensitive: {
					type: 'boolean',
					description: 'Case sensitive search',
					default: true,
				},
				max_results: {
					type: 'integer',
					description: 'Maximum number of results to return',
					default: 100,
				},
			},
			required: ['pattern'],
		},
	},
};

// Executor
async function searchFilesExecutor(args: Record<string, any>): Promise<Record<string, any>> {
	const {
		pattern,
		file_pattern,
		directory = '.',
		case_sensitive = true,
		max_results = 100,
	} = args;

	try {
		const rgArgs: string[] = ['rg', '--json'];

		if (!case_sensitive) {
			rgArgs.push('-i');
		}

		if (file_pattern) {
			rgArgs.push('-g', file_pattern);
		}

		rgArgs.push('--max-count', max_results.toString());
		rgArgs.push('--', pattern, directory);

		const {stdout, stderr} = await execAsync(rgArgs.join(' '));

		if (stderr && !stdout) {
			return createToolResponse(false, undefined, '', `Error: ${stderr}`);
		}

		const lines = stdout.trim().split('\n').filter(line => line);
		const matches: Array<{file: string; line: number; text: string}> = [];

		for (const line of lines) {
			try {
				const json = JSON.parse(line);
				if (json.type === 'match') {
					matches.push({
						file: json.data.path.text,
						line: json.data.line_number,
						text: json.data.lines.text.trim(),
					});
				}
			} catch {
				// Skip malformed JSON lines
			}
		}

		if (matches.length === 0) {
			return createToolResponse(true, '', 'No matches found');
		}

		const output = matches
			.map(m => `${m.file}:${m.line}: ${m.text}`)
			.join('\n');

		return createToolResponse(
			true,
			output,
			`Found ${matches.length} matches for "${pattern}"`,
		);
	} catch (error) {
		const err = error as Error;

		if (err.message.includes('command not found')) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: ripgrep (rg) not installed. Please install ripgrep to use search_files.',
			);
		}

		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Search failed: ${err.message}`,
		);
	}
}

// Register search tools
export function registerSearchTools(): void {
	ToolRegistry.registerTool(SEARCH_FILES_SCHEMA, searchFilesExecutor, 'safe');
}
