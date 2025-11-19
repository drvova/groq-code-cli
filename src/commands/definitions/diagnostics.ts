/**
 * Diagnostics Command - LSP diagnostics slash command
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import {CommandDefinition, CommandContext} from '../base.js';

export const diagnosticsCommand: CommandDefinition = {
	command: 'diagnostics',
	description: 'Show LSP diagnostics summary for the current workspace',
	handler(context: CommandContext) {
		context.addMessage({
			role: 'assistant',
			content: `I'll help you analyze your codebase with LSP diagnostics. Let me run the diagnostic tools:

1. First, I'll detect available LSP servers on your system
2. Then start the LSP diagnostics engine
3. Analyze your workspace for errors and warnings
4. Provide a comprehensive summary

Please use these tools:
- detect_lsp_servers - Detect available LSP servers
- start_lsp_diagnostics - Start LSP diagnostics engine
- analyze_workspace - Analyze entire workspace
- get_lsp_diagnostics_summary - Get diagnostics summary

For specific file analysis: analyze_lsp_file with file_path parameter
For files with errors only: get_files_with_errors`,
		});
	},
};
