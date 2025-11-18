import {CommandDefinition, CommandContext} from '../base.js';
import {SessionManager} from '../../utils/session-manager.js';

export const sessionsCommand: CommandDefinition = {
	command: 'sessions',
	description: 'List and manage saved conversation sessions',
	handler: ({addMessage}: CommandContext) => {
		const sessionManager = new SessionManager();
		const sessions = sessionManager.listSessions();

		if (sessions.length === 0) {
			addMessage({
				role: 'system',
				content:
					'No saved sessions found.\n\nUse `/save <name>` to save the current conversation.',
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
			content += `   Messages: ${session.messageCount} | Tokens: ${formatTokens(
				session.totalTokens,
			)}\n`;
			content += `   Model: ${session.provider}/${session.model}\n\n`;
		});

		content += '\n**Commands:**\n';
		content += '- `/new` - Start a new session (auto-saves current)\n';
		content += '- `/resume <name|id>` - Resume a session\n';
		content += '- `/save <name>` - Save current conversation\n';
		content += '- `/delete <name|id>` - Delete a session\n';

		addMessage({
			role: 'system',
			content,
		});
	},
};
