import {ToolSchema} from '../registry/tool-registry.js';

export const EXECUTE_COMMAND_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'execute_command',
		description:
			'Run shell commands, scripts, or code. SAFETY WARNING: Only use for commands that COMPLETE and EXIT (test scripts, build commands, short-running scripts). NEVER use for commands that run indefinitely (flask server, node app starting, python -m http.server, etc.). Always prefer short-running commands that exit. Example: {"command": "npm test", "command_type": "bash"}',
		parameters: {
			type: 'object',
			properties: {
				command: {
					type: 'string',
					description:
						'Shell command to execute. Only use commands that exit/stop automatically. Examples: "python my_script.py", "npm test", "ls -la". Avoid: long-running commands, "npm start" (starts servers), etc.',
				},
				command_type: {
					type: 'string',
					enum: ['bash', 'python', 'setup', 'run'],
					description:
						'Command type: bash (shell), python (script), setup (auto-run), run (needs approval)',
				},
				working_directory: {
					type: 'string',
					description: 'Directory to run command in (optional)',
				},
				timeout: {
					type: 'integer',
					description: 'Max execution time in seconds (1-300)',
					minimum: 1,
					maximum: 300,
				},
			},
			required: ['command', 'command_type'],
		},
	},
};

export const TERMINAL_SETUP_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'setup_terminal',
		description:
			'Automated setup for terminal integration (Warp, iTerm2, macOS Terminal). Detects current terminal and configures optimal settings, shell completions, and integration features. Provides terminal-specific enhancements and setup verification.',
		parameters: {
			type: 'object',
			properties: {
				setup_type: {
					type: 'string',
					enum: ['auto', 'completions', 'integration'],
					description:
						'Setup type: auto (full terminal setup), completions (shell completions only), integration (terminal-specific features)',
				},
				terminal_type: {
					type: 'string',
					enum: ['detect', 'warp', 'iterm2', 'macos-terminal', 'zed'],
					description:
						'Target terminal: detect (automatic), warp, iterm2, macos-terminal (macOS Terminal), zed (Zed Editor)',
				},
			},
			required: ['setup_type', 'terminal_type'],
		},
	},
};
