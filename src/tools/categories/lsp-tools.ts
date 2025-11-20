/**
 * LSP Tools - Language Server Protocol diagnostic tools
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import {ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse, ToolResult} from '../tools.js';
import {LSPManager} from '../../core/lsp-manager.js';
import {LSPDetector} from '../../core/lsp-detector.js';
import {DiagnosticSeverity} from 'vscode-languageserver-protocol';
import {
	DETECT_LSP_SERVERS_SCHEMA,
	START_LSP_DIAGNOSTICS_SCHEMA,
	STOP_LSP_DIAGNOSTICS_SCHEMA,
	ANALYZE_LSP_FILE_SCHEMA,
	GET_LSP_DIAGNOSTICS_SUMMARY_SCHEMA,
	ANALYZE_WORKSPACE_SCHEMA,
	GET_FILES_WITH_ERRORS_SCHEMA,
} from '../schemas/lsp-schemas.js';
import path from 'path';
import fs from 'fs';
import glob from 'glob';

// Helper for LSP tool execution
async function executeLSPTool<T>(
	action: () => Promise<T>,
	formatter: (result: T) => {content: string; data?: any}
): Promise<ToolResult> {
	try {
		const result = await action();
		const formatted = formatter(result);
		return createToolResponse(true, formatted.content, undefined, undefined);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(false, undefined, '', `Error: ${err.message}`);
	}
}

/**
 * Detect available LSP servers on the system
 */
async function detectLSPServersExecutor(): Promise<ToolResult> {
	return executeLSPTool(
		() => LSPDetector.detectAll(),
		(result) => {
			const output = [
				`Found ${result.available.length} LSP server(s):\n`,
				...result.available.map(
					server =>
						`✓ ${server.name}\n  Command: ${server.command}\n  Languages: ${server.languages.join(', ')}\n  Path: ${server.path || 'N/A'}` +
						(server.version ? `\n  Version: ${server.version}` : ''),
				),
			];

			if (result.unavailable.length > 0) {
				output.push(`\nUnavailable servers (${result.unavailable.length}):`, ...result.unavailable.map(name => `  - ${name}`));
			}

			if (result.recommended) {
				output.push(`\nRecommended: ${result.recommended.name} (${result.recommended.command})`);
			}

			return {content: output.join('\n'), data: result};
		}
	);
}

/**
 * Start LSP diagnostics for workspace
 */
async function startLSPDiagnosticsExecutor(args: Record<string, any>): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			const workspacePath = args.workspace_path || process.cwd();
			const manager = LSPManager.getInstance(workspacePath);
			
			if (manager.getIsRunning()) return {running: true, path: workspacePath};
			
			await manager.start(args.server ? {serverCommand: args.server} : undefined);
			return {running: false, path: workspacePath, server: manager.getDetectedServer()};
		},
		(result) => {
			if (result.running) return {content: 'LSP diagnostics already running'};
			const serverInfo = result.server ? `${result.server.name} (${result.server.command})` : args.server || 'Unknown';
			return {content: `LSP diagnostics started with ${serverInfo}\nWorkspace: ${result.path}`};
		}
	);
}

/**
 * Stop LSP diagnostics
 */
async function stopLSPDiagnosticsExecutor(): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			await LSPManager.getInstance().stop();
			return true;
		},
		() => ({content: 'LSP diagnostics stopped'})
	);
}

/**
 * Analyze file with LSP
 */
async function analyzeLSPFileExecutor(args: Record<string, any>): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			const manager = LSPManager.getInstance();
			if (!manager.getIsRunning()) throw new Error('LSP diagnostics not running. Start it first with start_lsp_diagnostics');
			
			const filePath = path.resolve(args.file_path);
			if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
			
			return {
				diagnostic: await manager.analyzeFile(filePath),
				filePath
			};
		},
		({diagnostic, filePath}) => {
			if (!diagnostic || diagnostic.diagnostics.length === 0) {
				return {content: `No issues found in ${path.basename(filePath)}`, data: {diagnostics: []}};
			}

			const getCount = (s: DiagnosticSeverity) => diagnostic.diagnostics.filter(d => d.severity === s).length;
			const errors = diagnostic.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
			const warnings = diagnostic.diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning);

			const output = [
				`Analysis of ${path.basename(filePath)}:`,
				`Total issues: ${diagnostic.diagnostics.length}`,
				`  Errors: ${getCount(DiagnosticSeverity.Error)}`,
				`  Warnings: ${getCount(DiagnosticSeverity.Warning)}`,
				`  Info: ${getCount(DiagnosticSeverity.Information)}\n`,
			];

			if (errors.length > 0) output.push('Errors:', ...errors.map(e => `  Line ${e.range.start.line + 1}:${e.range.start.character + 1} - ${e.message}`));
			if (warnings.length > 0) output.push('\nWarnings:', ...warnings.map(w => `  Line ${w.range.start.line + 1}:${w.range.start.character + 1} - ${w.message}`));

			return {content: output.join('\n'), data: diagnostic};
		}
	);
}

/**
 * Get diagnostics summary for workspace
 */
async function getLSPDiagnosticsSummaryExecutor(): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			const manager = LSPManager.getInstance();
			if (!manager.getIsRunning()) throw new Error('LSP diagnostics not running. Start it first with start_lsp_diagnostics');
			return manager.getDiagnosticsSummary();
		},
		(summary) => {
			const output = [
				'LSP Diagnostics Summary:',
				`Total issues: ${summary.total}`,
				`  Errors: ${summary.errors}`,
				`  Warnings: ${summary.warnings}`,
				`  Info: ${summary.info}`,
				`  Hints: ${summary.hints}`,
				`Files with issues: ${summary.filesWithIssues}\n`,
			];

			if (summary.filesWithIssues > 0) {
				output.push('Files:');
				Array.from(summary.byFile.entries()).forEach(([filePath, fileDiag]) => {
					output.push(`  ${path.relative(process.cwd(), filePath)}: ${fileDiag.errors.length}E ${fileDiag.warnings.length}W ${fileDiag.info.length}I`);
				});
			}

			return {content: output.join('\n'), data: summary};
		}
	);
}

/**
 * Analyze workspace directory
 */
async function analyzeWorkspaceExecutor(args: Record<string, any>): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			const manager = LSPManager.getInstance();
			if (!manager.getIsRunning()) await manager.start();
			
			const directory = args.directory || process.cwd();
			const pattern = args.pattern || '**/*.{ts,tsx,js,jsx}';
			
			const files = glob.sync(pattern, {
				cwd: directory,
				absolute: true,
				ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
			});

			return {
				files,
				diagnostics: files.length > 0 ? await manager.analyzeFiles(files.slice(0, 50)) : [],
				stats: manager.getStats(),
				pattern
			};
		},
		({files, diagnostics, stats, pattern}) => {
			if (files.length === 0) return {content: `No files found matching pattern: ${pattern}`, data: {analyzed: 0, diagnostics: []}};
			
			return {
				content: `Analyzed ${files.length} files\nErrors: ${stats.errors}, Warnings: ${stats.warnings}`,
				data: {analyzed: files.length, stats, diagnostics}
			};
		}
	);
}

/**
 * Get files with errors
 */
async function getFilesWithErrorsExecutor(): Promise<ToolResult> {
	return executeLSPTool(
		async () => {
			const manager = LSPManager.getInstance();
			if (!manager.getIsRunning()) throw new Error('LSP diagnostics not running. Start it first with start_lsp_diagnostics');
			return manager.getFilesWithErrors();
		},
		(files) => {
			if (files.length === 0) return {content: 'No files with errors found', data: {files: []}};
			return {
				content: [`Files with errors (${files.length}):`, ...files.map(f => `  - ${path.relative(process.cwd(), f)}`)].join('\n'),
				data: {files}
			};
		}
	);
}

// Register all LSP tools
export function registerLSPTools(): void {
	ToolRegistry.registerTool(DETECT_LSP_SERVERS_SCHEMA, detectLSPServersExecutor, 'safe');
	ToolRegistry.registerTool(START_LSP_DIAGNOSTICS_SCHEMA, startLSPDiagnosticsExecutor, 'safe');
	ToolRegistry.registerTool(STOP_LSP_DIAGNOSTICS_SCHEMA, stopLSPDiagnosticsExecutor, 'safe');
	ToolRegistry.registerTool(ANALYZE_LSP_FILE_SCHEMA, analyzeLSPFileExecutor, 'safe');
	ToolRegistry.registerTool(GET_LSP_DIAGNOSTICS_SUMMARY_SCHEMA, getLSPDiagnosticsSummaryExecutor, 'safe');
	ToolRegistry.registerTool(ANALYZE_WORKSPACE_SCHEMA, analyzeWorkspaceExecutor, 'safe');
	ToolRegistry.registerTool(GET_FILES_WITH_ERRORS_SCHEMA, getFilesWithErrorsExecutor, 'safe');
}
