/**
 * Tool State Manager - Manages enabled/disabled state of tools
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for tool state
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import fs from 'fs';
import path from 'path';
import {homedir} from 'os';

interface ToolState {
	enabled: boolean;
	category?: string;
	disabledAt?: number;
}

interface ToolStateConfig {
	tools: Record<string, ToolState>;
	lastModified: number;
}

export class ToolStateManager {
	private static instance: ToolStateManager;
	private toolStates: Map<string, ToolState> = new Map();
	private configPath: string;

	private constructor() {
		const configDir = path.join(homedir(), '.groq-code-cli');
		this.configPath = path.join(configDir, 'tool-states.json');
		this.ensureConfigDir();
		this.loadStates();
	}

	static getInstance(): ToolStateManager {
		if (!ToolStateManager.instance) {
			ToolStateManager.instance = new ToolStateManager();
		}
		return ToolStateManager.instance;
	}

	private ensureConfigDir(): void {
		const dir = path.dirname(this.configPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, {recursive: true});
		}
	}

	private loadStates(): void {
		try {
			if (fs.existsSync(this.configPath)) {
				const data = fs.readFileSync(this.configPath, 'utf-8');
				const config: ToolStateConfig = JSON.parse(data);

				for (const [toolName, state] of Object.entries(config.tools)) {
					this.toolStates.set(toolName, state);
				}
			}
		} catch (error) {
			// Silent fail - start with empty state
		}
	}

	private saveStates(): void {
		try {
			const config: ToolStateConfig = {
				tools: Object.fromEntries(this.toolStates),
				lastModified: Date.now(),
			};

			fs.writeFileSync(
				this.configPath,
				JSON.stringify(config, null, 2),
				'utf-8',
			);
		} catch (error) {
			// Silent fail - don't block operations
		}
	}

	/**
	 * Check if a tool is enabled
	 */
	isToolEnabled(toolName: string): boolean {
		const state = this.toolStates.get(toolName);
		return state?.enabled ?? true; // Default to enabled
	}

	/**
	 * Enable a tool
	 */
	enableTool(toolName: string, category?: string): void {
		this.toolStates.set(toolName, {
			enabled: true,
			category,
		});
		this.saveStates();
	}

	/**
	 * Disable a tool
	 */
	disableTool(toolName: string, category?: string): void {
		this.toolStates.set(toolName, {
			enabled: false,
			category,
			disabledAt: Date.now(),
		});
		this.saveStates();
	}

	/**
	 * Toggle tool state
	 */
	toggleTool(toolName: string, category?: string): boolean {
		const currentState = this.isToolEnabled(toolName);
		if (currentState) {
			this.disableTool(toolName, category);
		} else {
			this.enableTool(toolName, category);
		}
		return !currentState;
	}

	/**
	 * Get all tool states
	 */
	getAllStates(): Map<string, ToolState> {
		return new Map(this.toolStates);
	}

	/**
	 * Enable all tools
	 */
	enableAll(): void {
		for (const toolName of this.toolStates.keys()) {
			const state = this.toolStates.get(toolName);
			if (state) {
				state.enabled = true;
			}
		}
		this.saveStates();
	}

	/**
	 * Disable all tools
	 */
	disableAll(): void {
		for (const toolName of this.toolStates.keys()) {
			const state = this.toolStates.get(toolName);
			if (state) {
				state.enabled = false;
				state.disabledAt = Date.now();
			}
		}
		this.saveStates();
	}

	/**
	 * Get count of enabled/disabled tools
	 */
	getStats(): {total: number; enabled: number; disabled: number} {
		let enabled = 0;
		let disabled = 0;

		for (const state of this.toolStates.values()) {
			if (state.enabled) {
				enabled++;
			} else {
				disabled++;
			}
		}

		return {
			total: this.toolStates.size,
			enabled,
			disabled,
		};
	}

	/**
	 * Reset to defaults (all enabled)
	 */
	reset(): void {
		this.toolStates.clear();
		this.saveStates();
	}
}
