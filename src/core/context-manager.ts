import fs from 'fs';
import path from 'path';
import {debugLog} from '../utils/debug.js';

export class ContextManager {
	private contextContent: string | null = null;
	private contextPath: string | null = null;

	constructor() {
		this.loadContext();
	}

	private loadContext() {
		try {
			const explicitContextFile = process.env.GROQ_CONTEXT_FILE;
			const baseDir = process.env.GROQ_CONTEXT_DIR || process.cwd();
			this.contextPath =
				explicitContextFile || path.join(baseDir, '.groq', 'context.md');
			
			if (fs.existsSync(this.contextPath)) {
				this.contextContent = fs.readFileSync(this.contextPath, 'utf-8');
			}
		} catch (error) {
			debugLog('Failed to load project context:', error);
		}
	}

	public getFormattedContext(): string | null {
		if (!this.contextContent) return null;

		const contextLimit = parseInt(
			process.env.GROQ_CONTEXT_LIMIT || '20000',
			10,
		);
		const trimmed =
			this.contextContent.length > contextLimit
				? this.contextContent.slice(0, contextLimit) + '\n... [truncated]'
				: this.contextContent;

		return `Project context loaded from ${
			process.env.GROQ_CONTEXT_FILE || '.groq/context.md'
		}. Use this as high-level reference when reasoning about the repository.\n\n${trimmed}`;
	}

	public getCurrentContext(): {content: string; path: string} | null {
		if (this.contextContent && this.contextPath) {
			return {content: this.contextContent, path: this.contextPath};
		}
		return null;
	}

	public restoreContext(contextContent: string, contextPath: string): string {
		const contextLimit = parseInt(
			process.env.GROQ_CONTEXT_LIMIT || '20000',
			10,
		);
		const trimmed =
			contextContent.length > contextLimit
				? contextContent.slice(0, contextLimit) + '\n... [truncated]'
				: contextContent;

		return `Project context loaded from ${contextPath} (session snapshot). Use this as high-level reference when reasoning about the repository.\n\n${trimmed}`;
	}
}
