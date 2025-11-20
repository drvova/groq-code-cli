import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {Agent} from '../../../core/agent.js';
import {useAgent} from '../../hooks/useAgent.js';
import {useTokenMetrics} from '../../hooks/useTokenMetrics.js';
import {useSessionStats} from '../../hooks/useSessionStats.js';
import {useSessionHandlers} from '../../hooks/useSessionHandlers.js';
import {useChatUIState} from '../../hooks/useChatUIState.js';
import {useChatHandlers} from '../../hooks/useChatHandlers.js';
import MessageHistory from './MessageHistory.js';
import MessageInput from './MessageInput.js';
import TokenMetrics from '../display/TokenMetrics.js';
import MCPStatus from '../display/MCPStatus.js';
import LSPStatus from '../display/LSPStatus.js';
import {TerminalStatus, getTerminalStatusConfig} from '../display/TerminalStatus.js';
import PendingToolApproval from '../input-overlays/PendingToolApproval.js';
import Login from '../input-overlays/Login.js';
import ModelSelector from '../input-overlays/ModelSelector.js';
import ProviderSelector from '../input-overlays/ProviderSelector.js';
import SessionSelector from '../input-overlays/SessionSelector.js';
import MCPSelector from '../input-overlays/MCPSelector.js';
import LSPSelector from '../input-overlays/LSPSelector.js';
import ToolSelector from '../input-overlays/ToolSelector.js';
import MaxIterationsContinue from '../input-overlays/MaxIterationsContinue.js';
import ErrorRetry from '../input-overlays/ErrorRetry.js';
import {getConfig} from '../../../core/config/index.js';

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
		total_time?: number;
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
		interruptRequest,
		toggleAutoApprove,
	} = agentHook;

	const uiState = useChatUIState();
	const {
		inputValue,
		setInputValue,
		showInput,
		setShowInput,
		showLogin,
		showModelSelector,
		showProviderSelector,
		showSessionSelector,
		showMCPSelector,
		showLSPSelector,
		showToolSelector,
		scrollOffset,
		setScrollOffset,
	} = uiState;

	const sessionHandlers = useSessionHandlers({
		agent,
		messages,
		sessionStats,
		addMessage: agentHook.addMessage,
		restoreSession: agentHook.restoreSession,
		clearSessionStats,
		addSessionTokens,
		setShowSessionSelector: uiState.setShowSessionSelector,
	});

	const {
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
	} = useChatHandlers({
		agent,
		uiState,
		agentHook,
		sessionStats,
		resetMetrics,
		clearSessionStats,
		sessionHandlers,
	});

	const [animationFrame, setAnimationFrame] = useState(0);

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
							onContinue={() => agentHook.respondToMaxIterations(true)}
							onStop={() => agentHook.respondToMaxIterations(false)}
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
					) : showToolSelector ? (
						<ToolSelector onCancel={handleToolCancel} />
					) : showModelSelector ? (
						<ModelSelector
							onSubmit={handleModelSelect}
							onCancel={handleModelCancel}
							currentModel={agent.getCurrentModel?.() || undefined}
						/>
					) : showSessionSelector ? (
						<SessionSelector
							onSubmit={sessionHandlers.handleSessionSelect}
							onDelete={sessionHandlers.handleSessionDelete}
							onCancel={sessionHandlers.handleSessionCancel}
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
						<TerminalStatus />
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
