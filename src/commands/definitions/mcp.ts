import {CommandDefinition, CommandContext} from '../base.js';

export const mcpCommand: CommandDefinition = {
	command: 'mcp',
	description: 'Manage MCP servers',
	handler: ({setShowMCPSelector}: CommandContext) => {
		if (setShowMCPSelector) {
			setShowMCPSelector(true);
		}
	},
};
