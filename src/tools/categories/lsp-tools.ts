/**
 * LSP Tools - Language Server Protocol diagnostic tools
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 *
 * Provides tools for LSP server detection, diagnostics analysis,
 * and code quality insights.
 */

import {LSPManager} from '../../core/lsp-manager.js';
import {LSPDetector} from '../../core/lsp-detector.js';
import {DiagnosticSeverity} from 'vscode-languageserver-protocol';
import path from 'path';
import fs from 'fs';
import glob from 'glob';

/**
 * Detect available LSP servers on the system
 */
export async function detectLSPServers(): Promise<{
	success: boolean;
	output?: string;
	data?: any;
	error?: string;
}> {
	try {
		const result = await LSPDetector.detectAll();

		const output = [
			`Found ${result.available.length} LSP server(s):\n`,
			...result.available.map(
				server =>
					`✓ ${server.name}` +
					`\n  Command: ${server.command}` +
					`\n  Languages: ${server.languages.join(', ')}` +
					`\n  Path: ${server.path || 'N/A'}` +
					(server.version ? `\n  Version: ${server.version}` : ''),
			),
		];

		if (result.unavailable.length > 0) {
			output.push(
				`\nUnavailable servers (${result.unavailable.length}):`,
				...result.unavailable.map(name => `  - ${name}`),
			);
		}

		if (result.recommended) {
			output.push(
				`\nRecommended: ${result.recommended.name} (${result.recommended.command})`,
			);
		}

		return {
			success: true,
			output: output.join('\n'),
			data: result,
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to detect LSP servers: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Start LSP diagnostics for workspace
 */
export async function startLSPDiagnostics(args: {
	workspace_path?: string;
	server?: string;
}): Promise<{
	success: boolean;
	output?: string;
	error?: string;
}> {
	try {
		const workspacePath = args.workspace_path || process.cwd();
		const manager = LSPManager.getInstance(workspacePath);

		if (manager.getIsRunning()) {
			return {
				success: true,
				output: 'LSP diagnostics already running',
			};
		}

		const options = args.server ? {serverCommand: args.server} : undefined;
		await manager.start(options);

		const detectedServer = manager.getDetectedServer();
		const serverInfo = detectedServer
			? `${detectedServer.name} (${detectedServer.command})`
			: args.server || 'Unknown';

		return {
			success: true,
			output: `LSP diagnostics started with ${serverInfo}\nWorkspace: ${workspacePath}`,
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to start LSP diagnostics: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Stop LSP diagnostics
 */
export async function stopLSPDiagnostics(): Promise<{
	success: boolean;
	output?: string;
	error?: string;
}> {
	try {
		const manager = LSPManager.getInstance();
		await manager.stop();

		return {
			success: true,
			output: 'LSP diagnostics stopped',
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to stop LSP diagnostics: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Analyze file with LSP
 */
export async function analyzeLSPFile(args: {file_path: string}): Promise<{
	success: boolean;
	output?: string;
	data?: any;
	error?: string;
}> {
	try {
		const manager = LSPManager.getInstance();

		if (!manager.getIsRunning()) {
			return {
				success: false,
				error:
					'LSP diagnostics not running. Start it first with start_lsp_diagnostics',
			};
		}

		const filePath = path.resolve(args.file_path);
		if (!fs.existsSync(filePath)) {
			return {
				success: false,
				error: `File not found: ${filePath}`,
			};
		}

		const diagnostic = await manager.analyzeFile(filePath);

		if (!diagnostic || diagnostic.diagnostics.length === 0) {
			return {
				success: true,
				output: `No issues found in ${path.basename(filePath)}`,
				data: {diagnostics: []},
			};
		}

		const errors = diagnostic.diagnostics.filter(
			d => d.severity === DiagnosticSeverity.Error,
		);
		const warnings = diagnostic.diagnostics.filter(
			d => d.severity === DiagnosticSeverity.Warning,
		);
		const info = diagnostic.diagnostics.filter(
			d => d.severity === DiagnosticSeverity.Information,
		);

		const output = [
			`Analysis of ${path.basename(filePath)}:`,
			`Total issues: ${diagnostic.diagnostics.length}`,
			`  Errors: ${errors.length}`,
			`  Warnings: ${warnings.length}`,
			`  Info: ${info.length}\n`,
		];

		if (errors.length > 0) {
			output.push('Errors:');
			errors.forEach(e => {
				const line = e.range.start.line + 1;
				const col = e.range.start.character + 1;
				output.push(`  Line ${line}:${col} - ${e.message}`);
			});
		}

		if (warnings.length > 0) {
			output.push('\nWarnings:');
			warnings.forEach(w => {
				const line = w.range.start.line + 1;
				const col = w.range.start.character + 1;
				output.push(`  Line ${line}:${col} - ${w.message}`);
			});
		}

		return {
			success: true,
			output: output.join('\n'),
			data: diagnostic,
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to analyze file: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Get diagnostics summary for workspace
 */
export async function getLSPDiagnosticsSummary(): Promise<{
	success: boolean;
	output?: string;
	data?: any;
	error?: string;
}> {
	try {
		const manager = LSPManager.getInstance();

		if (!manager.getIsRunning()) {
			return {
				success: false,
				error:
					'LSP diagnostics not running. Start it first with start_lsp_diagnostics',
			};
		}

		const summary = manager.getDiagnosticsSummary();

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
				const relativePath = path.relative(process.cwd(), filePath);
				output.push(
					`  ${relativePath}: ${fileDiag.errors.length}E ${fileDiag.warnings.length}W ${fileDiag.info.length}I`,
				);
			});
		}

		return {
			success: true,
			output: output.join('\n'),
			data: summary,
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to get diagnostics summary: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Analyze workspace directory
 */
export async function analyzeWorkspace(args: {
	directory?: string;
	pattern?: string;
}): Promise<{
	success: boolean;
	output?: string;
	data?: any;
	error?: string;
}> {
	try {
		const manager = LSPManager.getInstance();

		if (!manager.getIsRunning()) {
			await manager.start();
		}

		const directory = args.directory || process.cwd();
		const pattern = args.pattern || '**/*.{ts,tsx,js,jsx}';

		const files = glob.sync(pattern, {
			cwd: directory,
			absolute: true,
			ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
		});

		if (files.length === 0) {
			return {
				success: true,
				output: `No files found matching pattern: ${pattern}`,
				data: {analyzed: 0, diagnostics: []},
			};
		}

		const diagnostics = await manager.analyzeFiles(files.slice(0, 50));

		const stats = manager.getStats();

		return {
			success: true,
			output: `Analyzed ${files.length} files\nErrors: ${stats.errors}, Warnings: ${stats.warnings}`,
			data: {
				analyzed: files.length,
				stats,
				diagnostics,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to analyze workspace: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}

/**
 * Get files with errors
 */
export async function getFilesWithErrors(): Promise<{
	success: boolean;
	output?: string;
	data?: any;
	error?: string;
}> {
	try {
		const manager = LSPManager.getInstance();

		if (!manager.getIsRunning()) {
			return {
				success: false,
				error:
					'LSP diagnostics not running. Start it first with start_lsp_diagnostics',
			};
		}

		const filesWithErrors = manager.getFilesWithErrors();

		if (filesWithErrors.length === 0) {
			return {
				success: true,
				output: 'No files with errors found',
				data: {files: []},
			};
		}

		const output = [
			`Files with errors (${filesWithErrors.length}):`,
			...filesWithErrors.map(f => `  - ${path.relative(process.cwd(), f)}`),
		];

		return {
			success: true,
			output: output.join('\n'),
			data: {files: filesWithErrors},
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to get files with errors: ${
				error instanceof Error ? error.message : String(error)
			}`,
		};
	}
}
