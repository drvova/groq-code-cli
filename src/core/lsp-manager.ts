/**
 * LSP Manager - Centralized LSP diagnostics management
 * Constitutional compliance: AMENDMENT III - Single Source of Truth
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 *
 * Manages LSP client lifecycle, diagnostics aggregation, and provides
 * a unified interface for diagnostics access across the application.
 */

import {LSPClient, LSPDiagnostic, LSPClientOptions} from './lsp-client.js';
import {LSPDetector, LSPServerConfig} from './lsp-detector.js';
import {Diagnostic, DiagnosticSeverity} from 'vscode-languageserver-protocol';
import path from 'path';
import {debugLog} from '../utils/debug.js';

export interface DiagnosticsSummary {
	total: number;
	errors: number;
	warnings: number;
	info: number;
	hints: number;
	filesWithIssues: number;
	byFile: Map<string, FileDiagnostics>;
}

export interface FileDiagnostics {
	filePath: string;
	errors: Diagnostic[];
	warnings: Diagnostic[];
	info: Diagnostic[];
	hints: Diagnostic[];
	total: number;
}

export class LSPManager {
	private static instance: LSPManager | null = null;
	private client: LSPClient | null = null;
	private workspaceRoot: string;
	private diagnosticsCallbacks: Set<(diagnostic: LSPDiagnostic) => void> =
		new Set();
	private serverReadyCallbacks: Set<() => void> = new Set();
	private serverErrorCallbacks: Set<(error: string) => void> = new Set();
	private isRunning: boolean = false;
	private detectedServer: LSPServerConfig | null = null;

	private constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(workspaceRoot?: string): LSPManager {
		if (!this.instance) {
			const root = workspaceRoot || process.cwd();
			this.instance = new LSPManager(root);
		}
		return this.instance;
	}

	/**
	 * Reset singleton instance
	 */
	static resetInstance(): void {
		if (this.instance) {
			this.instance.stop();
			this.instance = null;
		}
	}

	/**
	 * Initialize and start LSP server
	 */
	async start(options?: Partial<LSPClientOptions>): Promise<void> {
		if (this.isRunning) {
			debugLog('LSP Manager already running');
			return;
		}

		try {
			debugLog('Detecting LSP server...');
			this.detectedServer = await LSPDetector.getRecommendedForWorkspace(
				this.workspaceRoot,
			);

			if (!this.detectedServer && !options?.serverCommand) {
				throw new Error(
					'No LSP server detected. Install typescript-language-server: npm install -g typescript-language-server typescript',
				);
			}

			const clientOptions: LSPClientOptions = {
				workspaceRoot: this.workspaceRoot,
				serverCommand: options?.serverCommand || this.detectedServer?.command,
				serverArgs: options?.serverArgs || this.detectedServer?.args,
				onDiagnostics: diagnostic => {
					this.diagnosticsCallbacks.forEach(cb => cb(diagnostic));
				},
				onServerReady: () => {
					this.isRunning = true;
					this.serverReadyCallbacks.forEach(cb => cb());
					debugLog('LSP server ready');
				},
				onServerError: error => {
					this.serverErrorCallbacks.forEach(cb => cb(error));
					debugLog('LSP server error:', error);
				},
			};

			this.client = new LSPClient(clientOptions);
			await this.client.start();
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			debugLog('Failed to start LSP manager:', errorMsg);
			throw error;
		}
	}

	/**
	 * Try to auto-start LSP server with bundled servers (silent failure)
	 * Returns true if successfully started, false otherwise
	 */
	async tryAutoStart(): Promise<boolean> {
		if (this.isRunning) {
			return true;
		}

		try {
			const detectedServer = await LSPDetector.getRecommendedForWorkspace(
				this.workspaceRoot,
			);

			if (!detectedServer) {
				return false;
			}

			await this.start();
			return true;
		} catch (error) {
			debugLog('Auto-start failed silently:', error);
			return false;
		}
	}

	/**
	 * Stop LSP server
	 */
	async stop(): Promise<void> {
		if (this.client) {
			await this.client.stop();
			this.client = null;
		}
		this.isRunning = false;
		this.detectedServer = null;
		debugLog('LSP server stopped');
	}

	/**
	 * Check if LSP server is running
	 */
	getIsRunning(): boolean {
		return this.isRunning && this.client !== null;
	}

	/**
	 * Get detected server info
	 */
	getDetectedServer(): LSPServerConfig | null {
		return this.detectedServer;
	}

	/**
	 * Analyze file and get diagnostics
	 */
	async analyzeFile(filePath: string): Promise<LSPDiagnostic | undefined> {
		if (!this.client) {
			throw new Error('LSP client not initialized');
		}

		const relativePath = path.relative(this.workspaceRoot, filePath);
		await this.client.openDocument(relativePath);

		await new Promise(resolve => setTimeout(resolve, 500));

		return this.client.getDiagnostics(relativePath);
	}

	/**
	 * Analyze multiple files
	 */
	async analyzeFiles(filePaths: string[]): Promise<LSPDiagnostic[]> {
		if (!this.client) {
			throw new Error('LSP client not initialized');
		}

		const diagnostics: LSPDiagnostic[] = [];

		for (const filePath of filePaths) {
			const diagnostic = await this.analyzeFile(filePath);
			if (diagnostic) {
				diagnostics.push(diagnostic);
			}
		}

		return diagnostics;
	}

	/**
	 * Get all current diagnostics
	 */
	getAllDiagnostics(): LSPDiagnostic[] {
		if (!this.client) return [];
		return this.client.getAllDiagnostics();
	}

	/**
	 * Get diagnostics summary with categorization
	 */
	getDiagnosticsSummary(): DiagnosticsSummary {
		const allDiagnostics = this.getAllDiagnostics();
		const byFile = new Map<string, FileDiagnostics>();

		let totalErrors = 0;
		let totalWarnings = 0;
		let totalInfo = 0;
		let totalHints = 0;

		for (const diagnostic of allDiagnostics) {
			const filePath = diagnostic.filePath;
			const fileDiag: FileDiagnostics = byFile.get(filePath) || {
				filePath,
				errors: [],
				warnings: [],
				info: [],
				hints: [],
				total: 0,
			};

			for (const diag of diagnostic.diagnostics) {
				switch (diag.severity) {
					case DiagnosticSeverity.Error:
						fileDiag.errors.push(diag);
						totalErrors++;
						break;
					case DiagnosticSeverity.Warning:
						fileDiag.warnings.push(diag);
						totalWarnings++;
						break;
					case DiagnosticSeverity.Information:
						fileDiag.info.push(diag);
						totalInfo++;
						break;
					case DiagnosticSeverity.Hint:
						fileDiag.hints.push(diag);
						totalHints++;
						break;
				}
			}

			fileDiag.total = diagnostic.diagnostics.length;
			byFile.set(filePath, fileDiag);
		}

		return {
			total: totalErrors + totalWarnings + totalInfo + totalHints,
			errors: totalErrors,
			warnings: totalWarnings,
			info: totalInfo,
			hints: totalHints,
			filesWithIssues: byFile.size,
			byFile,
		};
	}

	/**
	 * Get diagnostics for specific severity level
	 */
	getDiagnosticsBySeverity(
		severity: DiagnosticSeverity,
	): Array<{filePath: string; diagnostic: Diagnostic}> {
		const allDiagnostics = this.getAllDiagnostics();
		const filtered: Array<{filePath: string; diagnostic: Diagnostic}> = [];

		for (const diag of allDiagnostics) {
			for (const d of diag.diagnostics) {
				if (d.severity === severity) {
					filtered.push({
						filePath: diag.filePath,
						diagnostic: d,
					});
				}
			}
		}

		return filtered;
	}

	/**
	 * Get files with errors
	 */
	getFilesWithErrors(): string[] {
		const errors = this.getDiagnosticsBySeverity(DiagnosticSeverity.Error);
		return [...new Set(errors.map(e => e.filePath))];
	}

	/**
	 * Close file analysis
	 */
	async closeFile(filePath: string): Promise<void> {
		if (!this.client) return;
		const relativePath = path.relative(this.workspaceRoot, filePath);
		await this.client.closeDocument(relativePath);
	}

	/**
	 * Register diagnostics callback
	 */
	onDiagnostics(callback: (diagnostic: LSPDiagnostic) => void): () => void {
		this.diagnosticsCallbacks.add(callback);
		return () => this.diagnosticsCallbacks.delete(callback);
	}

	/**
	 * Register server ready callback
	 */
	onServerReady(callback: () => void): () => void {
		this.serverReadyCallbacks.add(callback);
		return () => this.serverReadyCallbacks.delete(callback);
	}

	/**
	 * Register server error callback
	 */
	onServerError(callback: (error: string) => void): () => void {
		this.serverErrorCallbacks.add(callback);
		return () => this.serverErrorCallbacks.delete(callback);
	}

	/**
	 * Clear all diagnostics
	 */
	clearDiagnostics(): void {
		if (this.client) {
			this.stop();
		}
	}

	/**
	 * Get statistics
	 */
	getStats(): {
		total: number;
		errors: number;
		warnings: number;
		info: number;
		hints: number;
		filesWithIssues: number;
	} {
		if (!this.client) {
			return {
				total: 0,
				errors: 0,
				warnings: 0,
				info: 0,
				hints: 0,
				filesWithIssues: 0,
			};
		}
		return this.client.getDiagnosticsStats();
	}
}
