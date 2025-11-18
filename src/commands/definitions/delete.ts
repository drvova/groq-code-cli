import {CommandDefinition, CommandContext} from '../base.js';
import {SessionManager} from '../../utils/session-manager.js';

export const deleteCommand: CommandDefinition = {
	command: 'delete',
	description: 'Delete a saved conversation session',
	handler: ({addMessage}: CommandContext, args?: string) => {
		if (!args || args.trim() === '') {
			addMessage({
				role: 'system',
				content: 'Usage: `/delete <name|id>`\n\nSpecify a session name or ID to delete. Use `/sessions` to see available sessions.',
			});
			return;
		}

		const sessionManager = new SessionManager();
		const identifier = args.trim();

		let sessionId = identifier;
		const session = sessionManager.findSessionByName(identifier);
		if (session) {
			sessionId = session.id;
		}

		const deleted = sessionManager.deleteSession(sessionId);

		if (deleted) {
			addMessage({
				role: 'system',
				content: `Session deleted: **${identifier}**`,
			});
		} else {
			addMessage({
				role: 'system',
				content: `Failed to delete session: "${identifier}"\n\nUse \`/sessions\` to see available sessions.`,
			});
		}
	},
};
