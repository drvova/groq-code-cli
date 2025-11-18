import {CommandDefinition, CommandContext} from '../base.js';
import {SessionManager} from '../../utils/session-manager.js';

export const resumeCommand: CommandDefinition = {
	command: 'resume',
	description: 'Resume a saved conversation session',
	handler: ({addMessage}: CommandContext, args?: string) => {
		if (!args || args.trim() === '') {
			addMessage({
				role: 'system',
				content: 'Usage: `/resume <name|id>`\n\nSpecify a session name or ID to resume. Use `/sessions` to see available sessions.',
			});
			return;
		}

		const sessionManager = new SessionManager();
		const identifier = args.trim();

		let session = sessionManager.getSession(identifier);
		if (!session) {
			session = sessionManager.findSessionByName(identifier);
		}

		if (!session) {
			addMessage({
				role: 'system',
				content: `Session not found: "${identifier}"\n\nUse \`/sessions\` to see available sessions.`,
			});
			return;
		}

		addMessage({
			role: 'system',
			content: `Resuming session: **${session.name}**\n\nMessages: ${session.messageCount} | Tokens: ${session.stats.totalTokens}\nModel: ${session.provider}/${session.model}`,
			meta: {
				action: 'restore_session',
				session,
			},
		});
	},
};
