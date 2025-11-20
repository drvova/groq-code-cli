import {useApp} from 'ink';
import {useEffect} from 'react';
import {handleSlashCommand} from '../../commands/index.js';
import {getConfig} from '../../core/config/index.js';
import {Agent} from '../../core/agent.js';

interface UseChatHandlersProps {
	agent: Agent;
	uiState: any;
	agentHook: any;
	sessionStats: any;
	resetMetrics: () => void;
	clearSessionStats: () => void;
	sessionHandlers: any;
}

export function useChatHandlers({
	agent,
	uiState,
	agentHook,
	sessionStats,
	resetMetrics,
	clearSessionStats,
	sessionHandlers,
}: UseChatHandlersProps) {
	const {exit} = useApp();
	const {
		setInputValue,
		setShowLogin,
		setShowModelSelector,
		setShowProviderSelector,
		setShowSessionSelector,
		setShowMCPSelector,
		setShowLSPSelector,
		setShowToolSelector,
	} = uiState;

	const {
		messages,
		isProcessing,
		sendMessage,
		addMessage,
		clearHistory,
		toggleReasoning,
		showReasoning,
		approveToolExecution,
		respondToError,
	} = agentHook;

	const {handleSaveSession, handleRestoreSession} = sessionHandlers;

	const handleSendMessage = async (message: string) => {
		if (message.trim() && !isProcessing) {
			setInputValue('');

			// Handle shell commands with ! prefix
			if (message.startsWith('!')) {
				const shellCommand = message.slice(1).trim();
				if (shellCommand) {
					addMessage({
						role: 'user',
						content: message,
					});
					addMessage({
						role: 'assistant',
						content: `Executing shell command: \`${shellCommand}\``,
					});
					await sendMessage(`Execute this shell command: ${shellCommand}`);
				}
				return;
			}

			// Handle slash commands
			if (message.startsWith('/')) {
				handleSlashCommand(message, {
					addMessage: (msg: any) => {
						const msgId = addMessage(msg);
						// Handle session actions from command metadata
						if (msg.meta?.action === 'save_session') {
							handleSaveSession(msg.meta.sessionName);
						} else if (msg.meta?.action === 'restore_session') {
							handleRestoreSession(msg.meta.session);
						}
						return msgId;
					},
					clearHistory: () => {
						clearHistory();
						clearSessionStats();
						resetMetrics();
					},
					setShowLogin,
					setShowModelSelector,
					setShowProviderSelector,
					setShowSessionSelector,
					setShowMCPSelector,
					setShowLSPSelector,
					setShowToolSelector,
					toggleReasoning,
					showReasoning,
					sessionStats,
				});
				return;
			}

			await sendMessage(message);
		}
	};

	const handleApproval = (approved: boolean, autoApproveSession?: boolean) => {
		approveToolExecution(approved, autoApproveSession);
	};

	const handleErrorRetry = () => {
		respondToError(true);
	};

	const handleErrorCancel = () => {
		respondToError(false);
	};

	const handleLogin = (apiKey: string) => {
		setShowLogin(false);
		const configManager = getConfig().getConfigManager();
		const selectedProvider = configManager.getSelectedProvider() || 'groq';
		configManager.setProviderApiKey(selectedProvider, apiKey);
		agent.clearApiKey();
		addMessage({
			role: 'system',
			content: `API key saved for ${selectedProvider}. You can now start chatting.`,
		});
	};

	const handleLoginCancel = () => {
		setShowLogin(false);
		addMessage({
			role: 'system',
			content: 'Login canceled.',
		});
	};

	const handleModelSelect = (model: string) => {
		setShowModelSelector(false);
		clearHistory();
		clearSessionStats();
		agent.setModel(model);
		addMessage({
			role: 'system',
			content: `Switched to model: ${model}. Chat history has been cleared.`,
		});
	};

	const handleModelCancel = () => {
		setShowModelSelector(false);
		addMessage({
			role: 'system',
			content: 'Model selection canceled.',
		});
	};

	const handleProviderSelect = (providerId: string) => {
		setShowProviderSelector(false);
		const configManager = getConfig().getConfigManager();
		configManager.setSelectedProvider(providerId);
		addMessage({
			role: 'system',
			content: `Selected provider: ${providerId}. Use /login to authenticate.`,
		});
	};

	const handleProviderCancel = () => {
		setShowProviderSelector(false);
		addMessage({
			role: 'system',
			content: 'Provider selection canceled.',
		});
	};

	const handleMCPRefresh = async () => {
		await agent.refreshMCPTools();
	};

	const handleMCPCancel = () => {
		setShowMCPSelector(false);
		addMessage({
			role: 'system',
			content: 'MCP server management closed.',
		});
	};

	const handleLSPCancel = () => {
		setShowLSPSelector(false);
		addMessage({
			role: 'system',
			content: 'LSP server management closed.',
		});
	};

	const handleToolCancel = () => {
		setShowToolSelector(false);
		addMessage({
			role: 'system',
			content: 'Tool management closed.',
		});
	};

	return {
		handleSendMessage,
		handleApproval,
		handleErrorRetry,
		handleErrorCancel,
		handleLogin,
		handleLoginCancel,
		handleModelSelect,
		handleModelCancel,
		handleProviderSelect,
		handleProviderCancel,
		handleMCPRefresh,
		handleMCPCancel,
		handleLSPCancel,
		handleToolCancel,
		exit,
	};
}
