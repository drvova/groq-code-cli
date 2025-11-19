/**
 * LSP Client - Language Server Protocol client implementation
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 *
 * Provides TypeScript/JavaScript language server integration for diagnostics,
 * code intelligence, and real-time error detection.
 */

import {
	createMessageConnection,
	MessageConnection,
	Logger,
	StreamMessageReader,
	StreamMessageWriter,
} from 'vscode-jsonrpc/node.js';
import {
	InitializeParams,
	InitializeRequest,
	InitializedNotification,
	DidOpenTextDocumentNotification,
	DidChangeTextDocumentNotification,
	DidCloseTextDocumentNotification,
	PublishDiagnosticsNotification,
	Diagnostic,
	DiagnosticSeverity,
	TextDocumentItem,
	VersionedTextDocumentIdentifier,
	TextDocumentContentChangeEvent,
} from 'vscode-languageserver-protocol';
import {spawn, ChildProcess} from 'child_process';
import {URI} from 'vscode-uri';
import path from 'path';
import fs from 'fs';
import {LSPDetector, LSPServerConfig} from './lsp-detector.js';

export interface LSPDiagnostic {
	uri: string;
	filePath: string;
	diagnostics: Diagnostic[];
	timestamp: number;
}

export interface LSPClientOptions {
	workspaceRoot: string;
	serverCommand?: string;
	serverArgs?: string[];
	serverPath?: string;
	isBundled?: boolean;
	onDiagnostics?: (diagnostic: LSPDiagnostic) => void;
	onServerReady?: () => void;
	onServerError?: (error: string) => void;
}

export class LSPClient {
	private connection: MessageConnection | null = null;
	private serverProcess: ChildProcess | null = null;
	private workspaceRoot: string;
	private diagnosticsMap: Map<string, LSPDiagnostic> = new Map();
	private documentVersions: Map<string, number> = new Map();
	private options: LSPClientOptions;
	private isInitialized: boolean = false;

	constructor(options: LSPClientOptions) {
		this.workspaceRoot = path.resolve(options.workspaceRoot);
		this.options = options;
	}

	/**
	 * Start the language server and initialize connection
	 */
	async start(): Promise<void> {
		let serverCommand = this.options.serverCommand;
		let serverArgs = this.options.serverArgs;
		let serverPath = this.options.serverPath;
		let isBundled = this.options.isBundled;

		if (!serverCommand) {
			const detectedServer = await LSPDetector.getRecommendedForWorkspace(
				this.workspaceRoot,
			);

			if (!detectedServer) {
				throw new Error(
					'No LSP server detected. Please install typescript-language-server: npm install -g typescript-language-server typescript',
				);
			}

			serverCommand = detectedServer.command;
			serverArgs = detectedServer.args;
			serverPath = detectedServer.path;
			isBundled = detectedServer.version === 'bundled';
		}

		if (!serverArgs) {
			serverArgs = ['--stdio'];
		}

		// Ensure we have a valid command
		if (!serverCommand) {
			throw new Error('No server command specified');
		}

		// If we have a bundled server with a path, use node to execute it
		let actualCommand: string = serverCommand;
		let actualArgs: string[] = serverArgs;

		if (isBundled && serverPath) {
			// All bundled servers are node scripts - execute with node
			actualCommand = process.execPath; // node executable
			actualArgs = [serverPath, ...serverArgs];
		}

		try {
			this.serverProcess = spawn(actualCommand, actualArgs, {
				cwd: this.workspaceRoot,
				env: process.env,
			});

			if (!this.serverProcess.stdout || !this.serverProcess.stdin) {
				throw new Error('Failed to create server process streams');
			}

			const reader = new StreamMessageReader(this.serverProcess.stdout);
			const writer = new StreamMessageWriter(this.serverProcess.stdin);

			this.connection = createMessageConnection(
				reader,
				writer,
				this.createLogger(),
			);
			this.setupMessageHandlers();

			this.connection.listen();

			await this.initialize();
			this.isInitialized = true;

			if (this.options.onServerReady) {
				this.options.onServerReady();
			}
		} catch (error) {
			const errorMsg = `Failed to start LSP server: ${
				error instanceof Error ? error.message : String(error)
			}`;
			if (this.options.onServerError) {
				this.options.onServerError(errorMsg);
			}
			throw new Error(errorMsg);
		}
	}

	/**
	 * Initialize LSP server with workspace capabilities
	 */
	private async initialize(): Promise<void> {
		if (!this.connection) {
			throw new Error('Connection not established');
		}

		const workspaceUri = URI.file(this.workspaceRoot).toString();

		const params: InitializeParams = {
			processId: process.pid,
			rootUri: workspaceUri,
			capabilities: {
				textDocument: {
					synchronization: {
						dynamicRegistration: true,
						willSave: true,
						willSaveWaitUntil: true,
						didSave: true,
					},
					completion: {
						dynamicRegistration: true,
						completionItem: {
							snippetSupport: true,
							commitCharactersSupport: true,
							documentationFormat: ['markdown', 'plaintext'],
						},
					},
					hover: {
						dynamicRegistration: true,
						contentFormat: ['markdown', 'plaintext'],
					},
					publishDiagnostics: {
						relatedInformation: true,
						versionSupport: false,
						tagSupport: {
							valueSet: [1, 2],
						},
					},
				},
				workspace: {
					applyEdit: true,
					workspaceEdit: {
						documentChanges: true,
					},
					didChangeConfiguration: {
						dynamicRegistration: true,
					},
					didChangeWatchedFiles: {
						dynamicRegistration: true,
					},
				},
			},
		};

		await this.connection.sendRequest('initialize', params);
		await this.connection.sendNotification('initialized', {});
	}

	/**
	 * Setup message handlers for diagnostics and notifications
	 */
	private setupMessageHandlers(): void {
		if (!this.connection) return;

		this.connection.onNotification(
			'textDocument/publishDiagnostics',
			(params: any) => {
				const diagnostic: LSPDiagnostic = {
					uri: params.uri,
					filePath: URI.parse(params.uri).fsPath,
					diagnostics: params.diagnostics,
					timestamp: Date.now(),
				};

				this.diagnosticsMap.set(params.uri, diagnostic);

				if (this.options.onDiagnostics) {
					this.options.onDiagnostics(diagnostic);
				}
			},
		);

		if (this.serverProcess?.stderr) {
			this.serverProcess.stderr.on('data', data => {
				const errorMsg = data.toString();
				if (this.options.onServerError) {
					this.options.onServerError(errorMsg);
				}
			});
		}
	}

	/**
	 * Open a document for diagnostics tracking
	 */
	async openDocument(filePath: string): Promise<void> {
		if (!this.connection || !this.isInitialized) {
			throw new Error('LSP client not initialized');
		}

		const absolutePath = path.resolve(this.workspaceRoot, filePath);
		if (!fs.existsSync(absolutePath)) {
			throw new Error(`File not found: ${absolutePath}`);
		}

		const content = fs.readFileSync(absolutePath, 'utf-8');
		const uri = URI.file(absolutePath).toString();
		const languageId = this.detectLanguageId(absolutePath);

		const textDocument: TextDocumentItem = {
			uri,
			languageId,
			version: 1,
			text: content,
		};

		this.documentVersions.set(uri, 1);

		await this.connection.sendNotification('textDocument/didOpen', {
			textDocument,
		});
	}

	/**
	 * Update document content for re-analysis
	 */
	async updateDocument(filePath: string, changes: string): Promise<void> {
		if (!this.connection || !this.isInitialized) {
			throw new Error('LSP client not initialized');
		}

		const absolutePath = path.resolve(this.workspaceRoot, filePath);
		const uri = URI.file(absolutePath).toString();

		const currentVersion = this.documentVersions.get(uri) || 1;
		const newVersion = currentVersion + 1;
		this.documentVersions.set(uri, newVersion);

		const textDocument: VersionedTextDocumentIdentifier = {
			uri,
			version: newVersion,
		};

		const contentChanges: TextDocumentContentChangeEvent[] = [
			{
				text: changes,
			},
		];

		await this.connection.sendNotification('textDocument/didChange', {
			textDocument,
			contentChanges,
		});
	}

	/**
	 * Close document tracking
	 */
	async closeDocument(filePath: string): Promise<void> {
		if (!this.connection || !this.isInitialized) {
			throw new Error('LSP client not initialized');
		}

		const absolutePath = path.resolve(this.workspaceRoot, filePath);
		const uri = URI.file(absolutePath).toString();

		await this.connection.sendNotification('textDocument/didClose', {
			textDocument: {uri},
		});

		this.documentVersions.delete(uri);
		this.diagnosticsMap.delete(uri);
	}

	/**
	 * Get diagnostics for a specific file
	 */
	getDiagnostics(filePath: string): LSPDiagnostic | undefined {
		const absolutePath = path.resolve(this.workspaceRoot, filePath);
		const uri = URI.file(absolutePath).toString();
		return this.diagnosticsMap.get(uri);
	}

	/**
	 * Get all diagnostics across workspace
	 */
	getAllDiagnostics(): LSPDiagnostic[] {
		return Array.from(this.diagnosticsMap.values());
	}

	/**
	 * Get diagnostics statistics
	 */
	getDiagnosticsStats(): {
		total: number;
		errors: number;
		warnings: number;
		info: number;
		hints: number;
		filesWithIssues: number;
	} {
		let total = 0;
		let errors = 0;
		let warnings = 0;
		let info = 0;
		let hints = 0;

		for (const diagnostic of this.diagnosticsMap.values()) {
			total += diagnostic.diagnostics.length;

			for (const diag of diagnostic.diagnostics) {
				switch (diag.severity) {
					case DiagnosticSeverity.Error:
						errors++;
						break;
					case DiagnosticSeverity.Warning:
						warnings++;
						break;
					case DiagnosticSeverity.Information:
						info++;
						break;
					case DiagnosticSeverity.Hint:
						hints++;
						break;
				}
			}
		}

		return {
			total,
			errors,
			warnings,
			info,
			hints,
			filesWithIssues: this.diagnosticsMap.size,
		};
	}

	/**
	 * Stop the language server
	 */
	async stop(): Promise<void> {
		if (this.connection) {
			await this.connection.dispose();
			this.connection = null;
		}

		if (this.serverProcess) {
			this.serverProcess.kill();
			this.serverProcess = null;
		}

		this.diagnosticsMap.clear();
		this.documentVersions.clear();
		this.isInitialized = false;
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.isInitialized && this.connection !== null;
	}

	private detectLanguageId(filePath: string): string {
		const ext = path.extname(filePath).toLowerCase();
		const languageMap: Record<string, string> = {
			'.ts': 'typescript',
			'.tsx': 'typescriptreact',
			'.js': 'javascript',
			'.jsx': 'javascriptreact',
			'.json': 'json',
		};
		return languageMap[ext] || 'plaintext';
	}

	private createLogger(): Logger {
		return {
			error: (message: string) => {
				if (this.options.onServerError) {
					this.options.onServerError(`[LSP Error] ${message}`);
				}
			},
			warn: (message: string) => {
				if (this.options.onServerError) {
					this.options.onServerError(`[LSP Warning] ${message}`);
				}
			},
			info: () => {},
			log: () => {},
		};
	}
}
