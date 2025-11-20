/**
 * LSP Detector - Auto-detect available Language Servers from system PATH
 * Constitutional compliance: AMENDMENT VI - Provider-Agnostic Code
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 *
 * Automatically discovers and validates LSP servers installed on the system,
 * supporting multiple languages and providing fallback mechanisms.
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import {LSPServerConfig, KNOWN_SERVERS, INSTALL_INSTRUCTIONS} from './lsp-config.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export {LSPServerConfig};

export interface DetectionResult {
	available: LSPServerConfig[];
	unavailable: string[];
	recommended: LSPServerConfig | null;
}

export class LSPDetector {
	/**
	 * Detect all available LSP servers from system PATH
	 */
	static async detectAll(): Promise<DetectionResult> {
		const available: LSPServerConfig[] = [];
		const unavailable: string[] = [];

		const detectionPromises = KNOWN_SERVERS.map(async server => {
			const result = await this.detectServer(server);
			if (result.detected) {
				available.push(result);
			} else {
				unavailable.push(server.name);
			}
		});

		await Promise.all(detectionPromises);

		available.sort((a, b) => b.priority - a.priority);

		const recommended = available.length > 0 ? available[0] : null;

		return {
			available,
			unavailable,
			recommended,
		};
	}

	/**
	 * Detect LSP server for specific file extension
	 */
	static async detectForFile(
		filePath: string,
	): Promise<LSPServerConfig | null> {
		const ext = path.extname(filePath).toLowerCase();
		const candidates = KNOWN_SERVERS.filter(server =>
			server.fileExtensions.includes(ext),
		).sort((a, b) => b.priority - a.priority);

		for (const candidate of candidates) {
			const result = await this.detectServer(candidate);
			if (result.detected) {
				return result;
			}
		}

		return null;
	}

	/**
	 * Detect LSP servers for specific language
	 */
	static async detectForLanguage(language: string): Promise<LSPServerConfig[]> {
		const candidates = KNOWN_SERVERS.filter(server =>
			server.languages.includes(language.toLowerCase()),
		).sort((a, b) => b.priority - a.priority);

		const detected: LSPServerConfig[] = [];

		for (const candidate of candidates) {
			const result = await this.detectServer(candidate);
			if (result.detected) {
				detected.push(result);
			}
		}

		return detected;
	}

	/**
	 * Detect a specific LSP server
	 * Priority: 1. Bundled (node_modules/.bin) → 2. System PATH
	 */
	static async detectServer(
		serverConfig: Omit<LSPServerConfig, 'detected'>,
	): Promise<LSPServerConfig> {
		// First, check for bundled LSP servers in node_modules
		const bundledPath = await this.checkBundledServer(serverConfig.command);
		if (bundledPath) {
			return {
				...serverConfig,
				detected: true,
				path: bundledPath,
				version: 'bundled',
			};
		}

		// Fall back to system PATH
		const platform = process.platform;
		const isWindows = platform === 'win32';

		try {
			const command = isWindows
				? `where ${serverConfig.command}`
				: `which ${serverConfig.command}`;

			const {stdout} = await execAsync(command, {
				timeout: 5000,
				windowsHide: true,
			});

			const serverPath = stdout.trim().split('\n')[0];

			if (!serverPath) {
				return {...serverConfig, detected: false};
			}

			let version: string | undefined;
			try {
				const versionResult = await this.getServerVersion(
					serverConfig.command,
					serverPath,
				);
				version = versionResult;
			} catch {
				version = undefined;
			}

			return {
				...serverConfig,
				detected: true,
				path: serverPath,
				version,
			};
		} catch (error) {
			return {...serverConfig, detected: false};
		}
	}

	/**
	 * Check for bundled LSP server in node_modules
	 */
	private static async checkBundledServer(
		command: string,
	): Promise<string | null> {
		try {
			// Navigate from dist/core up to project root
			const projectRoot = path.resolve(__dirname, '../..');
			const nodeModulesBin = path.join(
				projectRoot,
				'node_modules',
				'.bin',
				command,
			);

			// Check if bundled server exists
			if (fs.existsSync(nodeModulesBin)) {
				return nodeModulesBin;
			}

			// Also check direct node_modules path for some servers
			const directPaths: Record<string, string> = {
				'typescript-language-server': 'typescript-language-server/lib/cli.mjs',
				'vscode-css-language-server':
					'vscode-langservers-extracted/bin/vscode-css-language-server',
				'vscode-html-language-server':
					'vscode-langservers-extracted/bin/vscode-html-language-server',
				'vscode-json-language-server':
					'vscode-langservers-extracted/bin/vscode-json-language-server',
				'vscode-eslint-language-server':
					'vscode-langservers-extracted/bin/vscode-eslint-language-server',
			};

			if (directPaths[command]) {
				const directPath = path.join(
					projectRoot,
					'node_modules',
					directPaths[command],
				);
				if (fs.existsSync(directPath)) {
					return directPath;
				}
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Get version of detected server
	 */
	private static async getServerVersion(
		command: string,
		serverPath: string,
	): Promise<string | undefined> {
		const versionArgs = ['--version', '-v', 'version'];

		for (const arg of versionArgs) {
			try {
				const {stdout} = await execAsync(`"${serverPath}" ${arg}`, {
					timeout: 3000,
					windowsHide: true,
				});

				const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
				if (versionMatch) {
					return versionMatch[1];
				}
			} catch {
				continue;
			}
		}

		return undefined;
	}

	/**
	 * Check if specific server is available
	 */
	static async isServerAvailable(serverName: string): Promise<boolean> {
		const server = KNOWN_SERVERS.find(
			s =>
				s.name.toLowerCase() === serverName.toLowerCase() ||
				s.command === serverName,
		);

		if (!server) return false;

		const result = await this.detectServer(server);
		return result.detected;
	}

	/**
	 * Get recommended server for workspace
	 */
	static async getRecommendedForWorkspace(
		workspacePath: string,
	): Promise<LSPServerConfig | null> {
		if (!fs.existsSync(workspacePath)) {
			return null;
		}

		const stats = fs.statSync(workspacePath);
		const targetPath = stats.isDirectory()
			? workspacePath
			: path.dirname(workspacePath);

		const files = fs.readdirSync(targetPath);
		const extensions = new Set<string>();

		files.forEach(file => {
			const ext = path.extname(file).toLowerCase();
			if (ext) extensions.add(ext);
		});

		if (
			extensions.has('.ts') ||
			extensions.has('.tsx') ||
			files.includes('tsconfig.json')
		) {
			const tsServers = await this.detectForLanguage('typescript');
			return tsServers.length > 0 ? tsServers[0] : null;
		}

		if (
			extensions.has('.js') ||
			extensions.has('.jsx') ||
			files.includes('package.json')
		) {
			const jsServers = await this.detectForLanguage('javascript');
			return jsServers.length > 0 ? jsServers[0] : null;
		}

		if (
			extensions.has('.py') ||
			files.includes('requirements.txt') ||
			files.includes('pyproject.toml')
		) {
			const pyServers = await this.detectForLanguage('python');
			return pyServers.length > 0 ? pyServers[0] : null;
		}

		if (extensions.has('.rs') || files.includes('Cargo.toml')) {
			const rsServers = await this.detectForLanguage('rust');
			return rsServers.length > 0 ? rsServers[0] : null;
		}

		if (extensions.has('.go') || files.includes('go.mod')) {
			const goServers = await this.detectForLanguage('go');
			return goServers.length > 0 ? goServers[0] : null;
		}

		const allDetected = await this.detectAll();
		return allDetected.recommended;
	}

	/**
	 * Install instructions for missing LSP server
	 */
	static getInstallInstructions(serverName: string): string {
		const server = KNOWN_SERVERS.find(
			s => s.name === serverName || s.command === serverName,
		);

		if (!server) return 'Server not found in known servers list.';

		return (
			INSTALL_INSTRUCTIONS[server.command] ||
			`Install ${server.command} via your package manager`
		);
	}

	/**
	 * Get all supported languages
	 */
	static getSupportedLanguages(): string[] {
		const languages = new Set<string>();
		KNOWN_SERVERS.forEach(server => {
			server.languages.forEach(lang => languages.add(lang));
		});
		return Array.from(languages).sort();
	}

	/**
	 * Get all supported file extensions
	 */
	static getSupportedExtensions(): string[] {
		const extensions = new Set<string>();
		KNOWN_SERVERS.forEach(server => {
			server.fileExtensions.forEach(ext => extensions.add(ext));
		});
		return Array.from(extensions).sort();
	}
}
