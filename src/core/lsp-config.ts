/**
 * LSP Configuration
 * Constitutional compliance: AMENDMENT IV - Clean Code
 */

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

export const KNOWN_SERVERS: Omit<LSPServerConfig, 'detected'>[] = [
	{
		name: 'TypeScript Language Server',
		command: 'typescript-language-server',
		args: ['--stdio'],
		languages: [
			'typescript',
			'javascript',
			'typescriptreact',
			'javascriptreact',
		],
		fileExtensions: [
			'.ts',
			'.tsx',
			'.js',
			'.jsx',
			'.mjs',
			'.cjs',
			'.mts',
			'.cts',
		],
		priority: 100,
	},
	{
		name: 'Deno Language Server',
		command: 'deno',
		args: ['lsp'],
		languages: ['typescript', 'javascript'],
		fileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
		priority: 95,
	},
	{
		name: 'ESLint Language Server',
		command: 'vscode-eslint-language-server',
		args: ['--stdio'],
		languages: [
			'typescript',
			'javascript',
			'typescriptreact',
			'javascriptreact',
			'vue',
		],
		fileExtensions: [
			'.ts',
			'.tsx',
			'.js',
			'.jsx',
			'.mjs',
			'.cjs',
			'.mts',
			'.cts',
			'.vue',
		],
		priority: 80,
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
		name: 'Ruby Language Server',
		command: 'ruby-lsp',
		args: [],
		languages: ['ruby'],
		fileExtensions: ['.rb', '.rake', '.gemspec', '.ru'],
		priority: 95,
	},
	{
		name: 'Elixir Language Server',
		command: 'elixir-ls',
		args: [],
		languages: ['elixir'],
		fileExtensions: ['.ex', '.exs'],
		priority: 95,
	},
	{
		name: 'Zig Language Server',
		command: 'zls',
		args: [],
		languages: ['zig'],
		fileExtensions: ['.zig', '.zon'],
		priority: 95,
	},
	{
		name: 'C# Language Server (OmniSharp)',
		command: 'omnisharp',
		args: ['--languageserver'],
		languages: ['csharp'],
		fileExtensions: ['.cs'],
		priority: 100,
	},
	{
		name: 'C/C++ Language Server (clangd)',
		command: 'clangd',
		args: [],
		languages: ['c', 'cpp'],
		fileExtensions: [
			'.c',
			'.cpp',
			'.cc',
			'.cxx',
			'.c++',
			'.h',
			'.hpp',
			'.hh',
			'.hxx',
			'.h++',
		],
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
		name: 'Lua Language Server',
		command: 'lua-language-server',
		args: [],
		languages: ['lua'],
		fileExtensions: ['.lua'],
		priority: 90,
	},
	{
		name: 'Swift Language Server (SourceKit-LSP)',
		command: 'sourcekit-lsp',
		args: [],
		languages: ['swift', 'objective-c', 'objective-cpp'],
		fileExtensions: ['.swift', '.objc', '.objcpp'],
		priority: 100,
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
		name: 'Vue Language Server (Volar)',
		command: 'vue-language-server',
		args: ['--stdio'],
		languages: ['vue'],
		fileExtensions: ['.vue'],
		priority: 95,
	},
	{
		name: 'Svelte Language Server',
		command: 'svelteserver',
		args: ['--stdio'],
		languages: ['svelte'],
		fileExtensions: ['.svelte'],
		priority: 95,
	},
	{
		name: 'Astro Language Server',
		command: 'astro-ls',
		args: ['--stdio'],
		languages: ['astro'],
		fileExtensions: ['.astro'],
		priority: 95,
	},
];

export const INSTALL_INSTRUCTIONS: Record<string, string> = {
	'typescript-language-server':
		'npm install -g typescript-language-server typescript',
	deno: 'curl -fsSL https://deno.land/install.sh | sh (or visit https://deno.land)',
	'vscode-eslint-language-server':
		'npm install -g vscode-eslint-language-server eslint',
	'pyright-langserver': 'npm install -g pyright',
	pylsp: 'pip install python-lsp-server',
	'rust-analyzer': 'rustup component add rust-analyzer',
	gopls: 'go install golang.org/x/tools/gopls@latest',
	'ruby-lsp': 'gem install ruby-lsp',
	'elixir-ls': 'Install via Elixir: mix archive.install hex elixir_ls',
	zls: 'Visit https://github.com/zigtools/zls for installation',
	omnisharp: 'Install .NET SDK, then: dotnet tool install -g csharp-ls',
	clangd:
		'Install via package manager: apt install clangd / brew install llvm',
	jdtls: 'Download from https://download.eclipse.org/jdtls/milestones/',
	intelephense: 'npm install -g intelephense',
	'lua-language-server':
		'Install from https://github.com/LuaLS/lua-language-server',
	'sourcekit-lsp': 'Install Xcode or Swift toolchain',
	'vscode-css-language-server':
		'npm install -g vscode-langservers-extracted',
	'vscode-html-language-server':
		'npm install -g vscode-langservers-extracted',
	'vscode-json-language-server':
		'npm install -g vscode-langservers-extracted',
	'bash-language-server': 'npm install -g bash-language-server',
	'yaml-language-server': 'npm install -g yaml-language-server',
	'vue-language-server': 'npm install -g @vue/language-server',
	svelteserver: 'npm install -g svelte-language-server',
	'astro-ls': 'npm install -g @astrojs/language-server',
};
