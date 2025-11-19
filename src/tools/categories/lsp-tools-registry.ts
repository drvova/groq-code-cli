/**
 * LSP Tools Registry - Register LSP diagnostic tools
 * Constitutional compliance: AMENDMENT III - Single Source of Truth
 */

import {ToolRegistry} from '../registry/tool-registry.js';
import {
	DETECT_LSP_SERVERS_SCHEMA,
	START_LSP_DIAGNOSTICS_SCHEMA,
	STOP_LSP_DIAGNOSTICS_SCHEMA,
	ANALYZE_LSP_FILE_SCHEMA,
	GET_LSP_DIAGNOSTICS_SUMMARY_SCHEMA,
	ANALYZE_WORKSPACE_SCHEMA,
	GET_FILES_WITH_ERRORS_SCHEMA,
} from '../schemas/lsp-schemas.js';
import {
	detectLSPServers,
	startLSPDiagnostics,
	stopLSPDiagnostics,
	analyzeLSPFile,
	getLSPDiagnosticsSummary,
	analyzeWorkspace,
	getFilesWithErrors,
} from './lsp-tools.js';

/**
 * Register all LSP diagnostic tools
 */
export function registerLSPTools(): void {
	ToolRegistry.registerTool(
		DETECT_LSP_SERVERS_SCHEMA,
		async () => await detectLSPServers(),
		'safe',
	);

	ToolRegistry.registerTool(
		START_LSP_DIAGNOSTICS_SCHEMA,
		async args => await startLSPDiagnostics(args),
		'safe',
	);

	ToolRegistry.registerTool(
		STOP_LSP_DIAGNOSTICS_SCHEMA,
		async () => await stopLSPDiagnostics(),
		'safe',
	);

	ToolRegistry.registerTool(
		ANALYZE_LSP_FILE_SCHEMA,
		async args => await analyzeLSPFile(args as {file_path: string}),
		'safe',
	);

	ToolRegistry.registerTool(
		GET_LSP_DIAGNOSTICS_SUMMARY_SCHEMA,
		async () => await getLSPDiagnosticsSummary(),
		'safe',
	);

	ToolRegistry.registerTool(
		ANALYZE_WORKSPACE_SCHEMA,
		async args => await analyzeWorkspace(args),
		'safe',
	);

	ToolRegistry.registerTool(
		GET_FILES_WITH_ERRORS_SCHEMA,
		async () => await getFilesWithErrors(),
		'safe',
	);
}
