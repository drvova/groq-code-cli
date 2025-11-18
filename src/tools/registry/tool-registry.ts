/**
 * Tool Registry - Central registry for all tool schemas and executors
 * Constitutional compliance: AMENDMENT III - Single Source of Truth for tool management
 */

export interface ToolSchema {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, any>;
			required: string[];
		};
	};
}

export type ToolCategory = 'safe' | 'approval_required' | 'dangerous';
export type ToolExecutor = (args: Record<string, any>) => Promise<Record<string, any>>;

export interface ToolDefinition {
	schema: ToolSchema;
	executor: ToolExecutor;
	category: ToolCategory;
}

export class ToolRegistry {
	private static tools = new Map<string, ToolDefinition>();
	private static categories = new Map<ToolCategory, Set<string>>();

	/**
	 * Register a tool with its schema, executor, and category
	 */
	static registerTool(
		schema: ToolSchema,
		executor: ToolExecutor,
		category: ToolCategory,
	): void {
		const toolName = schema.function.name;

		this.tools.set(toolName, { schema, executor, category });

		if (!this.categories.has(category)) {
			this.categories.set(category, new Set());
		}
		this.categories.get(category)!.add(toolName);
	}

	/**
	 * Get tool definition by name
	 */
	static getTool(name: string): ToolDefinition | undefined {
		return this.tools.get(name);
	}

	/**
	 * Get all tool schemas (for API calls)
	 */
	static getAllSchemas(): ToolSchema[] {
		return Array.from(this.tools.values()).map(def => def.schema);
	}

	/**
	 * Get tool category
	 */
	static getToolCategory(name: string): ToolCategory | undefined {
		return this.tools.get(name)?.category;
	}

	/**
	 * Get all tools in a category
	 */
	static getToolsByCategory(category: ToolCategory): string[] {
		return Array.from(this.categories.get(category) || []);
	}

	/**
	 * Execute a tool by name
	 */
	static async executeTool(
		name: string,
		args: Record<string, any>,
	): Promise<Record<string, any>> {
		const tool = this.tools.get(name);

		if (!tool) {
			return {
				success: false,
				error: `Unknown tool: ${name}`,
			};
		}

		try {
			return await tool.executor(args);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Check if tool exists
	 */
	static hasTool(name: string): boolean {
		return this.tools.has(name);
	}

	/**
	 * Get all registered tool names
	 */
	static getAllToolNames(): string[] {
		return Array.from(this.tools.keys());
	}

	/**
	 * Clear all registered tools (for testing)
	 */
	static clear(): void {
		this.tools.clear();
		this.categories.clear();
	}
}
