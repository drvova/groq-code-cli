/**
 * Terminal Detection and Setup Utilities
 * Constitutional compliance: AMENDMENT I - Scalable, composable code
 */

export interface TerminalInfo {
	name: string;
	appId?: string;
	version?: string;
	isSupported: boolean;
}

export type TerminalType =
	| 'warp'
	| 'iterm2'
	| 'macos-terminal'
	| 'zed'
	| 'ghostty'
	| 'kitty'
	| 'alacritty'
	| 'hyper'
	| 'windows-terminal'
	| 'unknown';

/**
 * Detect current terminal application
 * Uses environment variables and process inspection
 */
export function detectTerminal(): TerminalInfo {
	const env = process.env;

	// Warp terminal detection
	if (env.TERM_PROGRAM === 'WarpTerminal' || env.WARP_SESSION_ID) {
		return {
			name: 'Warp',
			appId: 'dev.warp.Warp-Stable',
			version: env.WARP_VERSION,
			isSupported: true,
		};
	}

	// iTerm2 detection
	if (env.TERM_PROGRAM === 'iTerm.app' || env.ITERM_SESSION_ID) {
		return {
			name: 'iTerm2',
			appId: 'com.googlecode.iterm2',
			version: env.TERM_PROGRAM_VERSION,
			isSupported: true,
		};
	}

	// macOS Terminal detection
	if (env.TERM_PROGRAM === 'Apple_Terminal') {
		return {
			name: 'macOS Terminal',
			appId: 'com.apple.Terminal',
			version: env.TERM_PROGRAM_VERSION,
			isSupported: true,
		};
	}

	// Zed terminal detection (integrated terminal or Zed CLI)
	if (env.ZED_EDITOR || env.ZED_PID || process.env.ZED_SOCKET) {
		return {
			name: 'Zed',
			appId: 'dev.zed.Zed',
			version: env.ZED_EDITOR_VERSION || 'unknown',
			isSupported: true,
		};
	}

	// Ghostty terminal detection
	if (env.GHOSTTY_RESOURCES_DIR || env.TERM === 'ghostty') {
		return {
			name: 'Ghostty',
			appId: 'com.mitchellh.ghostty',
			version: env.GHOSTTY_VERSION,
			isSupported: true,
		};
	}

	// Kitty terminal detection
	if (env.TERM === 'xterm-kitty' || env.KITTY_WINDOW_ID || env.KITTY_PID) {
		return {
			name: 'Kitty',
			appId: 'net.kovidgoyal.kitty',
			version: env.KITTY_VERSION,
			isSupported: true,
		};
	}

	// Alacritty terminal detection
	if (
		env.ALACRITTY_SOCKET ||
		env.ALACRITTY_LOG ||
		/alacritty/i.test(env.TERM_PROGRAM || '')
	) {
		return {
			name: 'Alacritty',
			appId: 'io.alacritty',
			version: env.ALACRITTY_VERSION,
			isSupported: true,
		};
	}

	// Hyper terminal detection
	if (env.TERM_PROGRAM === 'Hyper' || env.HYPER_VERSION) {
		return {
			name: 'Hyper',
			appId: 'co.zeit.hyper',
			version: env.HYPER_VERSION || env.TERM_PROGRAM_VERSION,
			isSupported: true,
		};
	}

	// Windows Terminal detection
	if (env.WT_SESSION || env.WT_PROFILE_ID) {
		return {
			name: 'Windows Terminal',
			appId: 'Microsoft.WindowsTerminal',
			version: env.WT_VERSION,
			isSupported: true,
		};
	}

	return {
		name: 'Unknown',
		isSupported: false,
	};
}

/**
 * Get terminal type enum from detected terminal
 */
export function getTerminalType(): TerminalType {
	const terminal = detectTerminal();

	if (terminal.name === 'Warp') return 'warp';
	if (terminal.name === 'iTerm2') return 'iterm2';
	if (terminal.name === 'macOS Terminal') return 'macos-terminal';
	if (terminal.name === 'Zed') return 'zed';
	if (terminal.name === 'Ghostty') return 'ghostty';
	if (terminal.name === 'Kitty') return 'kitty';
	if (terminal.name === 'Alacritty') return 'alacritty';
	if (terminal.name === 'Hyper') return 'hyper';
	if (terminal.name === 'Windows Terminal') return 'windows-terminal';

	return 'unknown';
}

/**
 * Check if current terminal supports advanced features
 */
export function supportsAdvancedFeatures(): boolean {
	const type = getTerminalType();
	return type !== 'unknown';
}

/**
 * Get terminal-specific setup instructions
 */
export function getSetupInstructions(): string {
	const terminal = detectTerminal();
	const type = getTerminalType();

	if (!terminal.isSupported) {
		return `
⚠️  Unsupported Terminal Detected

Your terminal: ${terminal.name}

Supported terminals:
- Warp (https://warp.dev)
- iTerm2 (https://iterm2.com)
- macOS Terminal
- Zed (https://zed.dev)
- Ghostty (https://ghostty.org)
- Kitty (https://sw.kovidgoyal.net/kitty)
- Alacritty (https://alacritty.org)
- Hyper (https://hyper.is)
- Windows Terminal (https://aka.ms/terminal)

Basic functionality will work, but advanced features may be limited.
    `.trim();
	}

	switch (type) {
		case 'warp':
			return `
✅ Warp Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- Rich command output
- Session restoration
- AI command suggestions
- Enhanced integration enabled
      `.trim();

		case 'iterm2':
			return `
✅ iTerm2 Detected (v${terminal.version || 'unknown'})

Advanced features available:
- Split panes support
- tmux integration
- Trigger-based automation
- Enhanced key bindings
      `.trim();

		case 'macos-terminal':
			return `
✅ macOS Terminal Detected (v${terminal.version || 'unknown'})

Standard features available:
- Basic integration enabled
- System-native appearance
- Accessibility support
      `.trim();

		case 'zed':
			return `
✅ Zed Editor Detected (v${terminal.version || 'unknown'})

Advanced features available:
- Integrated terminal support
- Multi-buffer workflow
- GPU-accelerated rendering
- Rust-based performance
      `.trim();

		case 'ghostty':
			return `
✅ Ghostty Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- GPU-accelerated rendering
- Native performance (C/Zig)
- Modern terminal protocols
- Fast, lightweight operation
      `.trim();

		case 'kitty':
			return `
✅ Kitty Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- GPU-accelerated rendering
- Image protocol support
- Ligature rendering
- Unicode 15.1 support
      `.trim();

		case 'alacritty':
			return `
✅ Alacritty Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- GPU-accelerated rendering
- Cross-platform support
- Minimal resource usage
- Vi-mode support
      `.trim();

		case 'hyper':
			return `
✅ Hyper Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- Electron-based interface
- Plugin ecosystem
- Web technologies integration
- Cross-platform support
      `.trim();

		case 'windows-terminal':
			return `
✅ Windows Terminal Detected (v${terminal.version || 'unknown'})

Advanced features available:
- Multi-tab support
- GPU-accelerated rendering
- Unicode support
- Multiple profiles
      `.trim();

		default:
			return 'Unknown terminal configuration';
	}
}
