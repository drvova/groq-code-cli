import {CommandDefinition, CommandContext} from '../base.js';

export const newCommand: CommandDefinition = {
	command: 'new',
	description: 'Start a new session (auto-saves current)',
	handler: ({addMessage, clearHistory}: CommandContext, args?: string) => {
		const skipSave = args?.includes('--no-save');

		if (!skipSave) {
			const timestamp = new Date().toLocaleString();
			addMessage({
				role: 'system',
				content: `Auto-saving current session...`,
				meta: {
					action: 'save_session',
					sessionName: `Session ${timestamp}`,
				},
			});
		}

		clearHistory();
		addMessage({
			role: 'system',
			content: skipSave
				? 'Started new session (previous session not saved).'
				: 'Started new session. Previous session auto-saved. Use `/sessions` to view saved sessions.',
		});
	},
};
