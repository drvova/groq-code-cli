import {CommandDefinition, CommandContext} from '../base.js';

export const clearCommand: CommandDefinition = {
	command: 'clear',
	description: 'Clear chat history and context',
	handler: ({addMessage, clearHistory}: CommandContext, args?: string) => {
		// Check if user wants to skip auto-save with --no-save flag
		const skipSave = args?.includes('--no-save');

		if (!skipSave) {
			// Trigger auto-save before clearing
			const timestamp = new Date().toLocaleString();
			addMessage({
				role: 'system',
				content: `Auto-saving session before clearing...`,
				meta: {
					action: 'save_session',
					sessionName: `Auto-save ${timestamp}`,
				},
			});
		}

		clearHistory();
		addMessage({
			role: 'system',
			content: skipSave
				? 'Chat history cleared (session not saved).'
				: 'Chat history cleared. Previous session auto-saved. Use `/sessions` to view saved sessions.',
		});
	},
};
