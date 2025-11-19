import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {Agent} from '../../../core/agent.js';
import {useAgent} from '../../hooks/useAgent.js';
import {useTokenMetrics} from '../../hooks/useTokenMetrics.js';
import {useSessionStats} from '../../hooks/useSessionStats.js';
import MessageHistory from './MessageHistory.js';
import MessageInput from './MessageInput.js';
import TokenMetrics from '../display/TokenMetrics.js';
import MCPStatus from '../display/MCPStatus.js';
import LSPStatus from '../display/LSPStatus.js';
import PendingToolApproval from '../input-overlays/PendingToolApproval.js';
import Login from '../input-overlays/Login.js';
import ModelSelector from '../input-overlays/ModelSelector.js';
import ProviderSelector from '../input-overlays/ProviderSelector.js';
import SessionSelector from '../input-overlays/SessionSelector.js';
import MCPSelector from '../input-overlays/MCPSelector.js';
import LSPSelector from '../input-overlays/LSPSelector.js';
import MaxIterationsContinue from '../input-overlays/MaxIterationsContinue.js';
import ErrorRetry from '../input-overlays/ErrorRetry.js';
import {handleSlashCommand} from '../../../commands/index.js';
import {getConfig} from '../../../core/config/index.js';
import {SessionManager} from '../../../utils/session-manager.js';

interface ChatProps {
	agent: Agent;
}

export default function Chat({agent}: ChatProps) {
	const {
		completionTokens,
		startTime,
		endTime,
		pausedTime,
		isPaused,
		isActive,
		startRequest,
		addApiTokens,
		pauseMetrics,
		resumeMetrics,
		completeRequest,
		resetMetrics,
	} = useTokenMetrics();

	const {sessionStats, addSessionTokens, clearSessionStats} = useSessionStats();

	// Wrapper function to add tokens to both per-request and session totals
	const handleApiTokens = (usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	}) => {
		addApiTokens(usage); // Add to current request metrics
		addSessionTokens(usage); // Add to cumulative session stats
	};

	const agentHook = useAgent(
		agent,
		startRequest, // Start tracking on new request
		handleApiTokens, // Add API usage tokens to both request and session totals
		pauseMetrics, // Pause during approval
		resumeMetrics, // Resume after approval
		completeRequest, // Complete when agent is done
	);

	const {
		messages,
		userMessageHistory,
		isProcessing,
		currentToolExecution,
		pendingApproval,
		pendingMaxIterations,
		pendingError,
		sessionAutoApprove,
		showReasoning,
		sendMessage,
		approveToolExecution,
		respondToMaxIterations,
		respondToError,
		addMessage,
		setApiKey,
		clearHistory,
		restoreSession,
		toggleAutoApprove,
		toggleReasoning,
		interruptRequest,
	} = agentHook;

	const {exit} = useApp();
	const [inputValue, setInputValue] = useState('');
	const [showInput, setShowInput] = useState(true);
	const [showLogin, setShowLogin] = useState(false);
	const [showModelSelector, setShowModelSelector] = useState(false);
	const [showProviderSelector, setShowProviderSelector] = useState(false);
	const [showSessionSelector, setShowSessionSelector] = useState(false);
	const [showMCPSelector, setShowMCPSelector] = useState(false);
	const [showLSPSelector, setShowLSPSelector] = useState(false);
	const [animationFrame, setAnimationFrame] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);

	// Handle global keyboard shortcuts
	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			exit();
		}
		if (key.shift && key.tab) {
			toggleAutoApprove();
		}

		// Allow scrolling with Shift+Up/Down/PageUp/PageDown regardless of input state
		if (key.shift) {
			if (key.upArrow) {
				setScrollOffset(prev => Math.min(prev + 1, messages.length - 1));
				return;
			}
			if (key.downArrow) {
				setScrollOffset(prev => Math.max(0, prev - 1));
				return;
			}
			if (key.pageUp) {
				setScrollOffset(prev => Math.min(prev + 5, messages.length - 1));
				return;
			}
			if (key.pageDown) {
				setScrollOffset(prev => Math.max(0, prev - 5));
				return;
			}
		}

		// Page Up/Down scrolling (without shift, only when input is empty)
		if (key.pageUp) {
			// If input is empty, allow scrolling
			if (!inputValue) {
				setScrollOffset(prev => Math.min(prev + 5, messages.length - 1));
			}
		} else if (key.pageDown) {
			// If input is empty, allow scrolling
			if (!inputValue) {
				setScrollOffset(prev => Math.max(0, prev - 5));
			}
		} else if (key.return && key.ctrl) {
			// Ctrl+Enter - scroll to bottom
			setScrollOffset(0);
		}

		if (key.escape) {
			// If waiting for error retry decision, cancel retry
			if (pendingError) {
				handleErrorCancel();
			}
			// If waiting for tool approval, reject the tool
			else if (pendingApproval) {
				handleApproval(false);
			}
			// If model is actively processing (but not waiting for approval or executing tools after approval)
			else if (isProcessing && !currentToolExecution) {
				interruptRequest();
			}
			// If user is typing and nothing else is happening, clear the input
			else if (showInput && inputValue.trim()) {
				setInputValue('');
			}
		}

		// Handle error retry keys
		if (pendingError) {
			if (input.toLowerCase() === 'r') {
				handleErrorRetry();
			} else if (input.toLowerCase() === 'c') {
				handleErrorCancel();
			}
		}
	});

	// Hide input when processing, waiting for approval, error retry, or showing login/model/provider selector
	useEffect(() => {
		setShowInput(
			!isProcessing &&
				!pendingApproval &&
				!pendingError &&
				!showLogin &&
				!showModelSelector &&
				!showProviderSelector &&
				!showMCPSelector &&
				!showLSPSelector,
		);
	}, [
		isProcessing,
		pendingApproval,
		pendingError,
		showLogin,
		showModelSelector,
		showProviderSelector,
		showMCPSelector,
		showLSPSelector,
	]);

	// Animation frame update for spinner
	useEffect(() => {
		const interval = setInterval(() => {
			setAnimationFrame(prev => (prev + 1) % 5);
		}, 200);
		return () => clearInterval(interval);
	}, []);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		setScrollOffset(0);
	}, [messages.length]);

	const handleSendMessage = async (message: string) => {
		if (message.trim() && !isProcessing) {
			setInputValue('');

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
					toggleReasoning,
					showReasoning,
					sessionStats,
				});
				return;
			}

			// The agent will handle starting request tracking
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

		// Save API key for the selected provider
		configManager.setProviderApiKey(selectedProvider, apiKey);

		// Reset agent client to force re-initialization with new key
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

	const handleModelSelect = (model: string) => {
		setShowModelSelector(false);
		// Clear chat history and session stats when switching models
		clearHistory();
		clearSessionStats();
		// Set the new model on the agent
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

	return (
		<Box flexDirection="column" height="100%">
			{/* Chat messages area - grows to fill available space */}
			<Box flexGrow={1} flexDirection="column" paddingX={1} minHeight={0}>
				<MessageHistory
					messages={messages}
					showReasoning={showReasoning}
					scrollOffset={scrollOffset}
					usageData={{
						prompt_tokens: sessionStats.promptTokens,
						completion_tokens: sessionStats.completionTokens,
						total_tokens: sessionStats.totalTokens,
						total_requests: sessionStats.totalRequests,
						total_time: sessionStats.totalTime,
						queue_time: 0,
						prompt_time: 0,
						completion_time: 0,
					}}
				/>
			</Box>

			{/* Fixed bottom section */}
			<Box flexDirection="column" flexShrink={0}>
				{/* Token metrics */}
				<TokenMetrics
					isActive={isActive}
					isPaused={isPaused}
					startTime={startTime}
					endTime={endTime}
					pausedTime={pausedTime}
					completionTokens={completionTokens}
				/>

				{/* Input area */}
				<Box paddingX={1}>
					{pendingApproval ? (
						<PendingToolApproval
							toolName={pendingApproval.toolName}
							toolArgs={pendingApproval.toolArgs}
							onApprove={() => handleApproval(true, false)}
							onReject={() => handleApproval(false, false)}
							onApproveWithAutoSession={() => handleApproval(true, true)}
						/>
					) : pendingMaxIterations ? (
						<MaxIterationsContinue
							maxIterations={pendingMaxIterations.maxIterations}
							onContinue={() => respondToMaxIterations(true)}
							onStop={() => respondToMaxIterations(false)}
						/>
					) : pendingError ? (
						<ErrorRetry
							error={pendingError.error}
							onRetry={handleErrorRetry}
							onCancel={handleErrorCancel}
						/>
					) : showLogin ? (
						<Login onSubmit={handleLogin} onCancel={handleLoginCancel} />
					) : showProviderSelector ? (
						<ProviderSelector
							onSubmit={handleProviderSelect}
							onCancel={handleProviderCancel}
							currentProvider={
								getConfig().getConfigManager().getSelectedProvider() ||
								undefined
							}
						/>
					) : showMCPSelector ? (
						<MCPSelector
							onCancel={handleMCPCancel}
							onRefresh={handleMCPRefresh}
						/>
					) : showLSPSelector ? (
						<LSPSelector onCancel={handleLSPCancel} />
					) : showModelSelector ? (
						<ModelSelector
							onSubmit={handleModelSelect}
							onCancel={handleModelCancel}
							currentModel={agent.getCurrentModel?.() || undefined}
						/>
					) : showSessionSelector ? (
						<SessionSelector
							onSubmit={handleSessionSelect}
							onDelete={handleSessionDelete}
							onCancel={handleSessionCancel}
						/>
					) : showInput ? (
						<MessageInput
							value={inputValue}
							onChange={setInputValue}
							onSubmit={handleSendMessage}
							placeholder="... (↑↓ history when empty, Esc clear, Ctrl+C exit)"
							userMessageHistory={userMessageHistory}
						/>
					) : (
						<Box>
							<Text color="cyan">
								{['█', '▓', '▒', '░', ' '][animationFrame]}
							</Text>
							<Text color="gray" dimColor>
								Processing
							</Text>
							<Text color="cyan">
								{[' ', '░', '▒', '▓', '█'][animationFrame]}
							</Text>
						</Box>
					)}
				</Box>

				{/* Status bar */}
				<Box justifyContent="space-between" paddingX={1}>
					<Box gap={2}>
						<MCPStatus />
						<LSPStatus />
						<Text color="cyan" bold>
							{sessionAutoApprove ? 'auto-approve edits is on' : ''}
						</Text>
					</Box>
					<Box>
						<Text color="gray" dimColor>
							{agent.getCurrentModel?.() || ''}
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
