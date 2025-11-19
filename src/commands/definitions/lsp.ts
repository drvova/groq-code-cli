import {CommandDefinition, CommandContext} from '../base.js';

export const lspCommand: CommandDefinition = {
	command: 'lsp',
	description: 'Manage LSP servers - select, start, stop, and configure language servers',
	handler: ({setShowLSPSelector}: CommandContext) => {
		if (setShowLSPSelector) {
			setShowLSPSelector(true);
		}
	},
};
