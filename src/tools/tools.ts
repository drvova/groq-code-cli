import {setReadFilesTracker} from './validators.js';

export interface ToolResult {
	success: boolean;
	content?: any;
	data?: any;
	message?: string;
	error?: string;
}

// Track which files have been read in the current session
const readFiles = new Set<string>();

// Export readFiles for validator access
export function getReadFilesTracker(): Set<string> {
	return readFiles;
}

// Initialize validator with readFiles tracker
setReadFilesTracker(readFiles);

/**
 * Format key parameters for tool call display
 */
export function formatToolParams(
	toolName: string,
	toolArgs: Record<string, any>,
	options: {includePrefix?: boolean; separator?: string} = {},
): string {
	const {includePrefix = true, separator = '='} = options;

	const paramMappings: Record<string, string[]> = {
		read_file: ['file_path'],
		create_file: ['file_path'],
		edit_file: ['file_path'],
		delete_file: ['file_path'],
		list_files: ['directory'],
		search_files: ['pattern'],
		execute_command: ['command'],
		create_tasks: [],
		update_tasks: [],
	};

	const keyParams = paramMappings[toolName] || [];

	if (keyParams.length === 0) {
		return '';
	}

	const paramParts = keyParams
		.filter(param => param in toolArgs)
		.map(param => {
			let value = toolArgs[param];
			// Truncate long values
			if (typeof value === 'string' && value.length > 50) {
				value = value.substring(0, 47) + '...';
			} else if (Array.isArray(value) && value.length > 3) {
				value = `[${value.length} items]`;
			}
			return `${param}${separator}${JSON.stringify(value)}`;
		});

	if (paramParts.length === 0) {
		return includePrefix
			? `Arguments: ${JSON.stringify(toolArgs)}`
			: JSON.stringify(toolArgs);
	}

	const formattedParams = paramParts.join(', ');
	return includePrefix ? `Parameters: ${formattedParams}` : formattedParams;
}

/**
 * Create a standardized tool response format
 */
export function createToolResponse(
	success: boolean,
	data?: any,
	message: string = '',
	error: string = '',
): ToolResult {
	const response: ToolResult = {success};

	if (success) {
		if (data !== undefined) {
			response.content = data;
		}
		if (message) {
			response.message = message;
		}
	} else {
		response.error = error;
		if (message) {
			response.message = message;
		}
	}

	return response;
}
