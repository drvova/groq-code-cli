export interface CommandContext {
	addMessage: (message: any) => void;
	clearHistory: () => void;
	setShowLogin: (show: boolean) => void;
	setShowModelSelector?: (show: boolean) => void;
	setShowProviderSelector?: (show: boolean) => void;
	setShowSessionSelector?: (show: boolean) => void;
	setShowMCPSelector?: (show: boolean) => void;
	toggleReasoning?: () => void;
	showReasoning?: boolean;
	sessionStats?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		totalRequests: number;
		totalTime: number;
	};
}

export interface CommandDefinition {
	command: string;
	description: string;
	handler: (context: CommandContext, args?: string) => void;
}

export abstract class BaseCommand implements CommandDefinition {
	abstract command: string;
	abstract description: string;
	abstract handler(context: CommandContext, args?: string): void;
}
