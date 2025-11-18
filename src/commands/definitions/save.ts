import {CommandDefinition, CommandContext} from '../base.js';

export const saveCommand: CommandDefinition = {
	command: 'save',
	description: 'Save current conversation session',
	handler: ({addMessage}: CommandContext, args?: string) => {
		const sessionName = args?.trim() || `Session ${new Date().toLocaleString()}`;

		addMessage({
			role: 'system',
			content: `Saving session: **${sessionName}**`,
			meta: {
				action: 'save_session',
				sessionName,
			},
		});
	},
};
