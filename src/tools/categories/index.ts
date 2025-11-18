/**
 * Tool Categories Index - Lazy-loaded tool registration
 * Constitutional compliance: AMENDMENT VIII - Comprehensive tool organization
 */

import {registerFileTools} from './file-tools.js';
import {registerSearchTools} from './search-tools.js';
import {registerShellTools} from './shell-tools.js';
import {registerTaskTools} from './task-tools.js';

/**
 * Initialize all tool categories
 * Called once at startup to register all available tools
 */
export function initializeAllTools(): void {
	registerFileTools();
	registerSearchTools();
	registerShellTools();
	registerTaskTools();
}

/**
 * Export individual registration functions for selective loading
 */
export {
	registerFileTools,
	registerSearchTools,
	registerShellTools,
	registerTaskTools,
};
