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

const execAsync = promisify(exec);

export interface LSPServerConfig {
	name: string;
	command: string;
	args: string[];
	languages: string[];
	fileExtensions: string[];
	priority: number;
	detected: boolean;
	version?: string;
	path?: string;
}

export interface DetectionResult {
	available: LSPServerConfig[];
	unavailable: string[];
	recommended: LSPServerConfig | null;
}

export class LSPDetector {
	private static readonly KNOWN_SERVERS: Omit<LSPServerConfig, 'detected'>[] = [
		{
			name: 'TypeScript Language Server',
			command: 'typescript-language-server',
			args: ['--stdio'],
			languages: ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
			fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
			priority: 100,
		},
		{
			name: 'TypeScript Server (tsserver)',
			command: 'tsserver',
			args: ['--stdio'],
			languages: ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'],
			fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
			priority: 90,
		},
		{
			name: 'Deno Language Server',
			command: 'deno',
			args: ['lsp'],
			languages: ['typescript', 'javascript'],
			fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
			priority: 85,
		},
		{
			name: 'Python Language Server (Pyright)',
			command: 'pyright-langserver',
			args: ['--stdio'],
			languages: ['python'],
			fileExtensions: ['.py', '.pyw', '.pyi'],
			priority: 95,
		},
		{
			name: 'Python Language Server (Pylsp)',
			command: 'pylsp',
			args: [],
			languages: ['python'],
			fileExtensions: ['.py', '.pyw', '.pyi'],
			priority: 85,
		},
		{
			name: 'Rust Analyzer',
			command: 'rust-analyzer',
			args: [],
			languages: ['rust'],
			fileExtensions: ['.rs'],
			priority: 100,
		},
		{
			name: 'Go Language Server (gopls)',
			command: 'gopls',
			args: [],
			languages: ['go'],
			fileExtensions: ['.go'],
			priority: 100,
		},
		{
			name: 'C/C++ Language Server (clangd)',
			command: 'clangd',
			args: [],
			languages: ['c', 'cpp'],
			fileExtensions: ['.c', '.cpp', '.h', '.hpp', '.cc', '.cxx'],
			priority: 100,
		},
		{
			name: 'Java Language Server',
			command: 'jdtls',
			args: [],
			languages: ['java'],
			fileExtensions: ['.java'],
			priority: 90,
		},
		{
			name: 'PHP Language Server',
			command: 'intelephense',
			args: ['--stdio'],
			languages: ['php'],
			fileExtensions: ['.php'],
			priority: 90,
		},
		{
			name: 'Ruby Language Server (Solargraph)',
			command: 'solargraph',
			args: ['stdio'],
			languages: ['ruby'],
			fileExtensions: ['.rb'],
			priority: 90,
		},
		{
			name: 'CSS Language Server',
			command: 'vscode-css-language-server',
			args: ['--stdio'],
			languages: ['css', 'scss', 'less'],
			fileExtensions: ['.css', '.scss', '.sass', '.less'],
			priority: 85,
		},
		{
			name: 'HTML Language Server',
			command: 'vscode-html-language-server',
			args: ['--stdio'],
			languages: ['html'],
			fileExtensions: ['.html', '.htm'],
			priority: 85,
		},
		{
			name: 'JSON Language Server',
			command: 'vscode-json-language-server',
			args: ['--stdio'],
			languages: ['json', 'jsonc'],
			fileExtensions: ['.json', '.jsonc'],
			priority: 85,
		},
		{
			name: 'Bash Language Server',
			command: 'bash-language-server',
			args: ['start'],
			languages: ['bash', 'sh'],
			fileExtensions: ['.sh', '.bash'],
			priority: 80,
		},
		{
			name: 'YAML Language Server',
			command: 'yaml-language-server',
			args: ['--stdio'],
			languages: ['yaml'],
			fileExtensions: ['.yaml', '.yml'],
			priority: 80,
		},
		{
			name: 'Vue Language Server',
			command: 'vls',
			args: [],
			languages: ['vue'],
			fileExtensions: ['.vue'],
			priority: 90,
		},
		{
			name: 'Svelte Language Server',
			command: 'svelteserver',
			args: ['--stdio'],
			languages: ['svelte'],
			fileExtensions: ['.svelte'],
			priority: 90,
		},
	];

	/**
	 * Detect all available LSP servers from system PATH
	 */
	static async detectAll(): Promise<DetectionResult> {
		const available: LSPServerConfig[] = [];
		const unavailable: string[] = [];

		const detectionPromises = this.KNOWN_SERVERS.map(async server => {
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
	static async detectForFile(filePath: string): Promise<LSPServerConfig | null> {
		const ext = path.extname(filePath).toLowerCase();
		const candidates = this.KNOWN_SERVERS.filter(server =>
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
		const candidates = this.KNOWN_SERVERS.filter(server =>
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
	 */
	static async detectServer(
		serverConfig: Omit<LSPServerConfig, 'detected'>,
	): Promise<LSPServerConfig> {
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
		const server = this.KNOWN_SERVERS.find(
			s => s.name.toLowerCase() === serverName.toLowerCase() || s.command === serverName,
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
		const targetPath = stats.isDirectory() ? workspacePath : path.dirname(workspacePath);

		const files = fs.readdirSync(targetPath);
		const extensions = new Set<string>();

		files.forEach(file => {
			const ext = path.extname(file).toLowerCase();
			if (ext) extensions.add(ext);
		});

		if (extensions.has('.ts') || extensions.has('.tsx') || files.includes('tsconfig.json')) {
			const tsServers = await this.detectForLanguage('typescript');
			return tsServers.length > 0 ? tsServers[0] : null;
		}

		if (extensions.has('.js') || extensions.has('.jsx') || files.includes('package.json')) {
			const jsServers = await this.detectForLanguage('javascript');
			return jsServers.length > 0 ? jsServers[0] : null;
		}

		if (extensions.has('.py') || files.includes('requirements.txt') || files.includes('pyproject.toml')) {
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
		const server = this.KNOWN_SERVERS.find(
			s => s.name === serverName || s.command === serverName,
		);

		if (!server) return 'Server not found in known servers list.';

		const instructions: Record<string, string> = {
			'typescript-language-server': 'npm install -g typescript-language-server typescript',
			'tsserver': 'npm install -g typescript',
			'deno': 'Visit https://deno.land for installation instructions',
			'pyright-langserver': 'npm install -g pyright',
			'pylsp': 'pip install python-lsp-server',
			'rust-analyzer': 'Visit https://rust-analyzer.github.io for installation instructions',
			'gopls': 'go install golang.org/x/tools/gopls@latest',
			'clangd': 'Install via your system package manager (apt, brew, etc.)',
			'jdtls': 'Visit https://github.com/eclipse/eclipse.jdt.ls for installation instructions',
			'intelephense': 'npm install -g intelephense',
			'solargraph': 'gem install solargraph',
			'vscode-css-language-server': 'npm install -g vscode-langservers-extracted',
			'vscode-html-language-server': 'npm install -g vscode-langservers-extracted',
			'vscode-json-language-server': 'npm install -g vscode-langservers-extracted',
			'bash-language-server': 'npm install -g bash-language-server',
			'yaml-language-server': 'npm install -g yaml-language-server',
			'vls': 'npm install -g vls',
			'svelteserver': 'npm install -g svelte-language-server',
		};

		return instructions[server.command] || `Install ${server.command} via your package manager`;
	}

	/**
	 * Get all supported languages
	 */
	static getSupportedLanguages(): string[] {
		const languages = new Set<string>();
		this.KNOWN_SERVERS.forEach(server => {
			server.languages.forEach(lang => languages.add(lang));
		});
		return Array.from(languages).sort();
	}

	/**
	 * Get all supported file extensions
	 */
	static getSupportedExtensions(): string[] {
		const extensions = new Set<string>();
		this.KNOWN_SERVERS.forEach(server => {
			server.fileExtensions.forEach(ext => extensions.add(ext));
		});
		return Array.from(extensions).sort();
	}
}
