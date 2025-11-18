/**
 * Shell Tools Category - Command execution operations
 * Constitutional compliance: AMENDMENT IV - Simple command execution
 */

import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';
import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

// Schema
const EXECUTE_COMMAND_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'execute_command',
		description:
			'Execute shell commands. IMPORTANT: Only for SHORT commands (tests, builds). NEVER run servers/daemons. Returns stdout/stderr. Example: {"command": "npm test", "timeout": 30000}',
		parameters: {
			type: 'object',
			properties: {
				command: {
					type: 'string',
					description:
						'Shell command to execute. Use for: tests, builds, git commands, file operations. AVOID: long-running servers, background processes.',
				},
				working_directory: {
					type: 'string',
					description: 'Working directory for command (default: current directory)',
					default: '.',
				},
				timeout: {
					type: 'integer',
					description: 'Command timeout in milliseconds (default: 30000)',
					default: 30000,
				},
			},
			required: ['command'],
		},
	},
};

// Executor
async function executeCommandExecutor(args: Record<string, any>): Promise<Record<string, any>> {
	const {command, working_directory = '.', timeout = 30000} = args;

	try {
		const {stdout, stderr} = await execAsync(command, {
			cwd: working_directory,
			timeout,
			maxBuffer: 10 * 1024 * 1024, // 10MB buffer
		});

		const output = [stdout, stderr].filter(s => s).join('\n');

		return createToolResponse(
			true,
			output,
			`Executed: ${command}`,
		);
	} catch (error: any) {
		// Check if it's a timeout error
		if (error.killed && error.signal === 'SIGTERM') {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Command timed out after ${timeout}ms`,
			);
		}

		// Command ran but exited with non-zero code
		if (error.code !== undefined) {
			const output = [error.stdout, error.stderr].filter(s => s).join('\n');
			return createToolResponse(
				false,
				output,
				'',
				`Command exited with code ${error.code}`,
			);
		}

		return createToolResponse(
			false,
			undefined,
			'',
			`Error: ${error.message}`,
		);
	}
}

// Register shell tools
export function registerShellTools(): void {
	ToolRegistry.registerTool(EXECUTE_COMMAND_SCHEMA, executeCommandExecutor, 'dangerous');
}
