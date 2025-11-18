/**
 * Shell Tools Category - Command execution
 * Constitutional compliance: AMENDMENT IV - Safe execution tools
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';
import {EXECUTE_COMMAND_SCHEMA} from '../schemas/shell-schemas.js';

const execAsync = promisify(exec);

// Executors
async function executeCommandExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {
		command,
		command_type,
		working_directory = process.cwd(),
		timeout = 30,
	} = args;

	try {
		// Validate command safety (basic checks)
		const dangerousPatterns = [
			'rm -rf /',
			'rm -rf ~',
			'mkfs',
			':(){:|:&};:',
			'dd if=/dev/zero',
		];
		if (dangerousPatterns.some(p => command.includes(p))) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: Command contains potentially dangerous patterns',
			);
		}

		const result = await execAsync(command, {
			cwd: working_directory,
			timeout: timeout * 1000,
			maxBuffer: 10 * 1024 * 1024, // 10MB buffer
		});

		let output = result.stdout;
		if (result.stderr) {
			output += `\nSTDERR:\n${result.stderr}`;
		}

		return createToolResponse(
			true,
			output.trim(),
			`Executed command: ${command}`,
		);
	} catch (error) {
		const err = error as any;
		let errorMessage = err.message || 'Unknown error';

		if (err.killed) {
			errorMessage = 'Command timed out';
		}

		// Include stdout/stderr if available even on error
		let output = '';
		if (err.stdout) output += `STDOUT:\n${err.stdout}\n`;
		if (err.stderr) output += `STDERR:\n${err.stderr}`;

		return createToolResponse(
			false,
			output.trim(),
			'',
			`Error executing command: ${errorMessage}`,
		);
	}
}

// Register all shell tools
export function registerShellTools(): void {
	ToolRegistry.registerTool(
		EXECUTE_COMMAND_SCHEMA,
		executeCommandExecutor,
		'dangerous',
	);
}
