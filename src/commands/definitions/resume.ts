import {CommandDefinition, CommandContext} from '../base.js';
import {SessionManager} from '../../utils/session-manager.js';

export const resumeCommand: CommandDefinition = {
	command: 'resume',
	description: 'List saved sessions or resume a specific one',
	handler: ({addMessage}: CommandContext, args?: string) => {
		const sessionManager = new SessionManager();

		// No args - list all sessions
		if (!args || args.trim() === '') {
			const sessions = sessionManager.listSessions();

			if (sessions.length === 0) {
				addMessage({
					role: 'system',
					content:
						'No saved sessions found.\n\nSessions are auto-saved when you use `/new` or `/clear`.',
				});
				return;
			}

			const formatDate = (timestamp: number): string => {
				const date = new Date(timestamp);
				const now = new Date();
				const diffMs = now.getTime() - date.getTime();
				const diffMins = Math.floor(diffMs / 60000);
				const diffHours = Math.floor(diffMs / 3600000);
				const diffDays = Math.floor(diffMs / 86400000);

				if (diffMins < 1) return 'just now';
				if (diffMins < 60) return `${diffMins}m ago`;
				if (diffHours < 24) return `${diffHours}h ago`;
				if (diffDays < 7) return `${diffDays}d ago`;
				return date.toLocaleDateString();
			};

			const formatTokens = (tokens: number): string => {
				if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
				if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
				return tokens.toString();
			};

			let content = '# Saved Sessions\n\n';
			sessions.forEach((session, index) => {
				content += `**${index + 1}. ${session.name}**\n`;
				content += `   ID: \`${session.id}\`\n`;
				content += `   Time: ${formatDate(session.timestamp)}\n`;
				content += `   Messages: ${
					session.messageCount
				} | Tokens: ${formatTokens(session.totalTokens)}\n`;
				content += `   Model: ${session.provider}/${session.model}\n\n`;
			});

			content += '\n**Commands:**\n';
			content += '- `/resume <name|id>` - Resume a specific session\n';
			content += '- `/delete <name|id>` - Delete a session\n';
			content += '- `/new` - Start new (auto-saves current)\n';
			content += '- `/clear` - Clear chat (auto-saves current)\n';

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
