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

export type TerminalType = 'warp' | 'iterm2' | 'macos-terminal' | 'zed' | 'unknown';

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

    default:
      return 'Unknown terminal configuration';
  }
}
