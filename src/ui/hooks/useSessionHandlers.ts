import {getConfig} from '../../core/config/index.js';
import {SessionManager} from '../../utils/session-manager.js';
import {Agent} from '../../core/agent.js';

interface UseSessionHandlersProps {
	agent: Agent;
	messages: any[];
	sessionStats: any;
	addMessage: (msg: any) => void;
	restoreSession: (session: any) => void;
	clearSessionStats: () => void;
	addSessionTokens: (tokens: any) => void;
	setShowSessionSelector: (show: boolean) => void;
}

export function useSessionHandlers({
	agent,
	messages,
	sessionStats,
	addMessage,
	restoreSession,
	clearSessionStats,
	addSessionTokens,
	setShowSessionSelector,
}: UseSessionHandlersProps) {
	const handleSaveSession = (sessionName: string) => {
		const sessionManager = new SessionManager();
		const configManager = getConfig().getConfigManager();
		const currentProvider = configManager.getSelectedProvider() || 'groq';
		const currentModel =
			configManager.getDefaultModel() || 'llama-3.3-70b-versatile';

		const agentMessages = agent.getMessages();
		const uiMessages = messages;

		const currentContext = agent.getCurrentContext();

		sessionManager.saveSession(
			sessionName,
			agentMessages,
			uiMessages,
			sessionStats,
			currentProvider,
			currentModel,
			currentContext?.content,
			currentContext?.path,
		);

		addMessage({
			role: 'system',
			content: `Session saved: **${sessionName}**\n\nMessages: ${
				uiMessages.length
			} | Tokens: ${sessionStats.totalTokens}${
				currentContext ? `\nContext: ${currentContext.path}` : ''
			}`,
		});
	};

	const handleRestoreSession = (session: any) => {
		restoreSession(session);
		const configManager = getConfig().getConfigManager();
		configManager.setSelectedProvider(session.provider);
		agent.setModel(session.model);

		if (session.contextSnapshot && session.contextPath) {
			const currentContext = agent.getCurrentContext();
			const contextChanged =
				!currentContext || currentContext.content !== session.contextSnapshot;

			if (contextChanged) {
				agent.restoreContext(session.contextSnapshot, session.contextPath);
				addMessage({
					role: 'system',
					content: `⚠ Context restored from session snapshot.\n\nThe current project context has changed since this session was saved. Using original context to preserve conversation coherence.`,
				});
			} else {
				addMessage({
					role: 'system',
					content: `✓ Context unchanged since session was saved.`,
				});
			}
		}

		clearSessionStats();
		addSessionTokens({
			prompt_tokens: session.stats.promptTokens,
			completion_tokens: session.stats.completionTokens,
			total_tokens: session.stats.totalTokens,
			total_time: session.stats.totalTime,
		});

		for (let i = 1; i < session.stats.totalRequests; i++) {
			addSessionTokens({
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			});
		}
	};

	const handleSessionSelect = (sessionId: string) => {
		setShowSessionSelector(false);
		const sessionManager = new SessionManager();
		const session = sessionManager.getSession(sessionId);

		if (session) {
			handleRestoreSession(session);
			addMessage({
				role: 'system',
				content: `Resumed session: **${session.name}**\n\nMessages: ${session.messageCount} | Tokens: ${session.stats.totalTokens}\nModel: ${session.provider}/${session.model}`,
			});
		} else {
			addMessage({
				role: 'system',
				content: 'Failed to load session.',
			});
		}
	};

	const handleSessionDelete = (sessionId: string) => {
		const sessionManager = new SessionManager();
		const session = sessionManager.getSession(sessionId);
		const sessionName = session?.name || sessionId;

		const deleted = sessionManager.deleteSession(sessionId);

		if (deleted) {
			addMessage({
				role: 'system',
				content: `Deleted session: **${sessionName}**`,
			});
		} else {
			addMessage({
				role: 'system',
				content: `Failed to delete session: **${sessionName}**`,
			});
		}
	};

	const handleSessionCancel = () => {
		setShowSessionSelector(false);
		addMessage({
			role: 'system',
			content: 'Session selection canceled.',
		});
	};

	return {
		handleSaveSession,
		handleRestoreSession,
		handleSessionSelect,
		handleSessionDelete,
		handleSessionCancel,
	};
}
