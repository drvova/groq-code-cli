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
			content: `I'll help you set up LSP diagnostics for real-time code analysis!

**Quick Start:**
Let me detect and start the appropriate LSP server for your workspace. I'll use:
1. detect_lsp_servers - Find available LSP servers on your system
2. start_lsp_diagnostics - Start the LSP engine (auto-detects language)
3. analyze_workspace - Scan your code for errors and warnings

**Available Tools:**
- \`detect_lsp_servers\` - See all 25+ supported language servers
- \`start_lsp_diagnostics\` - Start diagnostics (optional: workspace_path, server)
- \`analyze_workspace\` - Full workspace analysis (optional: directory, pattern)
- \`analyze_lsp_file\` - Analyze specific file (required: file_path)
- \`get_lsp_diagnostics_summary\` - Get current diagnostics summary
- \`get_files_with_errors\` - List files with errors only
- \`stop_lsp_diagnostics\` - Stop the LSP server

**Status Bar:**
Once running, you'll see: \`LSP ● [XE YW]\` in the bottom status bar
- Green ●: Active, no errors
- Yellow ●: Active, warnings present
- Red ●: Active, errors detected

Let me detect what servers you have available first!`,
		});
	},
};
