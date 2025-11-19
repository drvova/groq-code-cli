# LSP Diagnostics System

Comprehensive Language Server Protocol (LSP) integration for real-time code diagnostics and analysis.

## Overview

The LSP diagnostics system provides enterprise-grade code analysis with support for **25+ programming languages**, automatically detecting and using available language servers from your system PATH.

## Features

✅ **Auto-Detection**: Automatically finds LSP servers installed on your system  
✅ **25+ Languages**: TypeScript, JavaScript, Deno, Python, Rust, Go, Ruby, Elixir, Zig, C#, C/C++, Java, PHP, Lua, Swift, Vue, Svelte, Astro, and more  
✅ **Real-Time Analysis**: Live error and warning detection as you code  
✅ **UI Integration**: Status bar shows diagnostics at a glance  
✅ **Workspace Analysis**: Analyze entire projects or specific files  
✅ **Zero Configuration**: Works out of the box with installed servers

## Quick Start

### 1. Check Available Servers

```bash
# In the CLI, type:
/diagnostics

# The AI agent will automatically detect available servers
```

### 2. Start Diagnostics

The AI agent will use the `detect_lsp_servers` and `start_lsp_diagnostics` tools to activate LSP for your workspace.

### 3. Monitor Status

Watch the bottom status bar:
- `LSP: ○ Inactive (use /diagnostics)` - Not running
- `LSP ●` - Active, no issues (green)
- `LSP ● [5W]` - Active, 5 warnings (yellow)
- `LSP ● [3E 8W]` - Active, 3 errors + 8 warnings (red)

## Supported Language Servers

| Language Server | Extensions | Installation |
|----------------|------------|--------------|
| **TypeScript LS** | .ts, .tsx, .js, .jsx, .mjs, .cjs, .mts, .cts | `npm install -g typescript-language-server typescript` |
| **Deno** | .ts, .tsx, .js, .jsx, .mjs | `curl -fsSL https://deno.land/install.sh \| sh` |
| **ESLint LS** | .ts, .tsx, .js, .jsx, .vue | `npm install -g vscode-eslint-language-server eslint` |
| **Pyright** | .py, .pyi | `npm install -g pyright` |
| **Rust Analyzer** | .rs | `rustup component add rust-analyzer` |
| **gopls** | .go | `go install golang.org/x/tools/gopls@latest` |
| **Ruby LSP** | .rb, .rake, .gemspec, .ru | `gem install ruby-lsp` |
| **Elixir LS** | .ex, .exs | `mix archive.install hex elixir_ls` |
| **Zig LS** | .zig, .zon | Visit https://github.com/zigtools/zls |
| **OmniSharp** | .cs | Install .NET SDK |
| **clangd** | .c, .cpp, .h, .hpp | `apt install clangd` or `brew install llvm` |
| **jdtls** | .java | Download from eclipse.org/jdtls |
| **Lua LS** | .lua | Visit https://github.com/LuaLS/lua-language-server |
| **SourceKit-LSP** | .swift | Install Xcode or Swift toolchain |
| **Vue (Volar)** | .vue | `npm install -g @vue/language-server` |
| **Svelte LS** | .svelte | `npm install -g svelte-language-server` |
| **Astro LS** | .astro | `npm install -g @astrojs/language-server` |

[...and 8 more servers for CSS, HTML, JSON, YAML, Bash, PHP, etc.]

## Available Tools

The AI agent has access to these LSP diagnostic tools:

### `detect_lsp_servers`
Detects all available LSP servers on your system.

**Example:**
```
AI uses: detect_lsp_servers
Returns: List of 5 available servers (TypeScript, Python, Rust, Go, Vue)
```

### `start_lsp_diagnostics`
Starts the LSP diagnostics engine.

**Parameters:**
- `workspace_path` (optional): Path to workspace root
- `server` (optional): Specific server command to use

**Example:**
```
AI uses: start_lsp_diagnostics
Auto-detects: TypeScript Language Server for current workspace
Status: LSP ● activated
```

### `analyze_workspace`
Analyzes entire workspace for errors and warnings.

**Parameters:**
- `directory` (optional): Directory to analyze
- `pattern` (optional): File pattern (default: `**/*.{ts,tsx,js,jsx}`)

**Example:**
```
AI uses: analyze_workspace
Analyzes: 47 files
Finds: 3 errors, 8 warnings across 5 files
```

### `analyze_lsp_file`
Analyzes a specific file.

**Parameters:**
- `file_path` (required): Path to the file

**Example:**
```
AI uses: analyze_lsp_file with file_path="src/core/agent.ts"
Returns:
  Line 145:12 - Type 'string' is not assignable to type 'number'
  Line 203:5 - Unused variable 'tempVar'
```

### `get_lsp_diagnostics_summary`
Gets comprehensive diagnostics summary.

**Example:**
```
AI uses: get_lsp_diagnostics_summary
Returns:
  Total issues: 11
  Errors: 3
  Warnings: 8
  Files with issues: 5
```

### `get_files_with_errors`
Lists only files with errors.

**Example:**
```
AI uses: get_files_with_errors
Returns:
  - src/core/agent.ts
  - src/ui/App.tsx
  - src/tools/validators.ts
```

### `stop_lsp_diagnostics`
Stops the LSP diagnostics engine.

**Example:**
```
AI uses: stop_lsp_diagnostics
Status: LSP ○ Inactive
```

## Usage Examples

### Example 1: Basic Workspace Analysis

```
User: Check my TypeScript code for errors

AI Agent:
1. Uses detect_lsp_servers
   → Found: TypeScript Language Server
2. Uses start_lsp_diagnostics
   → Status: LSP ● activated
3. Uses analyze_workspace
   → Analyzed 47 TypeScript files
   → Found 3 errors, 12 warnings
4. Uses get_lsp_diagnostics_summary
   → Shows detailed breakdown by file
```

### Example 2: Specific File Analysis

```
User: Why is agent.ts failing?

AI Agent:
1. Uses analyze_lsp_file with file_path="src/core/agent.ts"
   → Line 145:12 - Type error
   → Line 203:5 - Unused variable
2. Provides explanation and fix suggestions
```

### Example 3: Multi-Language Project

```
User: /diagnostics

AI Agent:
1. Uses detect_lsp_servers
   → Found: TypeScript LS, Python LS, Rust Analyzer
2. Uses start_lsp_diagnostics
   → Auto-selected: TypeScript LS (primary language)
3. User can manually switch: "Use Python LSP instead"
4. AI uses start_lsp_diagnostics with server="pyright-langserver"
```

## Status Bar Indicators

The bottom status bar shows real-time LSP diagnostics:

| Display | Meaning |
|---------|---------|
| `LSP: ○ Inactive (use /diagnostics)` | LSP not running - type /diagnostics to start |
| `LSP ●` | Active, no issues (green) |
| `LSP ● [5W]` | Active, 5 warnings (yellow) |
| `LSP ● [3E]` | Active, 3 errors (red) |
| `LSP ● [3E 8W]` | Active, 3 errors + 8 warnings (red) |
| `LSP ● [2E 5W 10I]` | Active, errors + warnings + info (red) |

## Troubleshooting

### LSP Server Not Detected

**Problem:** `detect_lsp_servers` shows 0 servers

**Solution:**
1. Install a language server (see table above)
2. Verify installation: `which typescript-language-server`
3. Ensure PATH is configured correctly
4. Restart the CLI

### LSP Won't Start

**Problem:** `start_lsp_diagnostics` fails

**Solutions:**
- Install TypeScript locally: `npm install typescript`
- Check workspace has valid config (`tsconfig.json`, `package.json`)
- Try specific server: `start_lsp_diagnostics with server="rust-analyzer"`

### No Diagnostics Shown

**Problem:** LSP running but status shows `LSP ● [0E 0W]`

**Possible Reasons:**
- No errors in your code (good!)
- Files not yet analyzed - use `analyze_workspace`
- Wrong language server for your files

### Status Shows "Inactive"

**Problem:** Status bar shows `LSP: ○ Inactive`

**Solution:**
1. Type `/diagnostics`
2. AI agent will automatically start LSP
3. Or manually request: "Start LSP diagnostics"

## Architecture

### Components

1. **LSPDetector** (`src/core/lsp-detector.ts`)
   - Auto-detects language servers from PATH
   - Supports 25+ different servers
   - Provides install instructions

2. **LSPClient** (`src/core/lsp-client.ts`)
   - LSP protocol implementation
   - Uses `vscode-languageserver-protocol`
   - Real-time diagnostics streaming

3. **LSPManager** (`src/core/lsp-manager.ts`)
   - Centralized diagnostics management
   - Singleton pattern
   - Statistics and aggregation

4. **LSP Tools** (`src/tools/categories/lsp-tools.ts`)
   - 7 diagnostic tools
   - Integrated with tool registry
   - Safe category (no approval needed)

5. **LSPStatus UI** (`src/ui/components/display/LSPStatus.tsx`)
   - Real-time status display
   - Color-coded indicators
   - Auto-refresh every 2 seconds

## Best Practices

1. **Start Early**: Activate LSP at the beginning of your session
2. **Monitor Status**: Keep an eye on the status bar for real-time feedback
3. **Regular Analysis**: Run `analyze_workspace` after major changes
4. **File-Specific**: Use `analyze_lsp_file` for focused debugging
5. **Install Multiple**: Install servers for all languages you use
6. **Update Regularly**: Keep language servers updated for best results

## Performance Notes

- LSP analysis runs in separate process (non-blocking)
- Status updates every 2 seconds (configurable)
- Workspace analysis limited to 50 files by default
- Diagnostics cached until file changes

## Contributing

To add support for a new language server:

1. Add server config to `LSPDetector.KNOWN_SERVERS`
2. Update install instructions in `getInstallInstructions()`
3. Test detection with `detect_lsp_servers`
4. Submit PR with language server details

## License

Part of groq-code-cli project. See main LICENSE file.
