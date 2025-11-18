import {CommandDefinition, CommandContext} from '../base.js';
import {SessionManager} from '../../utils/session-manager.js';
import {
	formatRelativeDate,
	formatTokenCount,
} from '../../ui/components/display/utils/formatting.js';

export const resumeCommand: CommandDefinition = {
	command: 'resume',
	description: 'Interactive session picker or resume by name',
	handler: (
		{addMessage, setShowSessionSelector}: CommandContext,
		args?: string,
	) => {
		const sessionManager = new SessionManager();

		// No args - show interactive picker
		if (!args || args.trim() === '') {
			if (setShowSessionSelector) {
				setShowSessionSelector(true);
				return;
			}

			// Fallback to text list if picker unavailable
			const sessions = sessionManager.listSessions();

			if (sessions.length === 0) {
				addMessage({
					role: 'system',
					content:
						'No saved sessions found.\n\nSessions are auto-saved when you use `/new`.',
				});
				return;
			}

			let content = '# Saved Sessions\n\n';
			sessions.forEach((session, index) => {
				content += `**${index + 1}. ${session.name}**\n`;
				content += `   ID: \`${session.id}\`\n`;
				content += `   Time: ${formatRelativeDate(session.timestamp)}\n`;
				content += `   Messages: ${
					session.messageCount
				} | Tokens: ${formatTokenCount(session.totalTokens)}\n`;
				content += `   Model: ${session.provider}/${session.model}\n\n`;
			});

			content += '\n**Commands:**\n';
			content += '- `/resume <name|id>` - Resume a specific session\n';
			content += '- `/new` - Start new session (auto-saves current)\n';

			addMessage({
				role: 'system',
				content,
			});
			return;
		}

		// With args - resume specific session
		const identifier = args.trim();
		let session = sessionManager.getSession(identifier);
		if (!session) {
			session = sessionManager.findSessionByName(identifier);
		}

		if (!session) {
			addMessage({
				role: 'system',
				content: `Session not found: "${identifier}"\n\nUse \`/resume\` to see available sessions.`,
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
