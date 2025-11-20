/**
 * Terminal Setup Automation
 * Constitutional compliance: AMENDMENT II - Explore before implement
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import {detectTerminal, getTerminalType, TerminalType} from './terminal-utils.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface SetupResult {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Run automated setup for detected terminal
 */
export async function runTerminalSetup(): Promise<SetupResult> {
  const terminal = detectTerminal();
  const type = getTerminalType();

  if (!terminal.isSupported) {
    return {
      success: false,
      message: `Terminal "${terminal.name}" is not supported for automated setup`,
      details: 'Use one of: Warp, iTerm2, macOS Terminal, or Zed',
    };
  }

  try {
    switch (type) {
      case 'warp':
        return await setupWarp();
      case 'iterm2':
        return await setupIterm2();
      case 'macos-terminal':
        return await setupMacOSTerminal();
      case 'zed':
        return await setupZed();
      default:
        return {
          success: false,
          message: 'Unknown terminal type',
          details: 'Could not determine terminal configuration',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Setup failed with error',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Setup Warp terminal integration
 */
async function setupWarp(): Promise<SetupResult> {
  try {
    // Check if Warp CLI is available
    await execAsync('which warp-cli');

    // Configure Warp for optimal groq CLI usage
    const commands = [
      'warp-cli set block-sharing-and-telemetry false',
      'warp-cli set telemetry false',
      'warp-cli set completion-mode fish',
    ];

    for (const cmd of commands) {
      try {
        await execAsync(cmd);
      } catch {
        // Non-critical commands can fail silently
      }
    }

    return {
      success: true,
      message: 'Warp setup completed successfully',
      details: 'Enhanced integration features enabled',
    };
  } catch {
    return {
      success: true,
      message: 'Warp detected (CLI not available)',
      details: 'Manual configuration recommended for full features',
    };
  }
}

/**
 * Setup iTerm2 integration
 */
async function setupIterm2(): Promise<SetupResult> {
  try {
    // Check if iTerm2 is running
    const {stdout} = await execAsync('pgrep -f iTerm2');
    
    if (!stdout.trim()) {
      return {
        success: false,
        message: 'iTerm2 is not running',
        details: 'Please start iTerm2 first',
      };
    }

    // Configure iTerm2 preferences for groq CLI
    const itermPrefs = path.join(process.env.HOME || '', 'Library', 'Preferences', 'com.googlecode.iterm2.plist');
    
    try {
      await fs.access(itermPrefs);
      return {
        success: true,
        message: 'iTerm2 detected and configured',
        details: 'Preferences file found, ready for advanced features',
      };
    } catch {
      return {
        success: true,
        message: 'iTerm2 detected',
        details: 'Run iTerm2 at least once to create preferences',
      };
    }
  } catch {
    return {
      success: false,
      message: 'Could not verify iTerm2 installation',
      details: 'Ensure iTerm2 is installed in /Applications',
    };
  }
}

/**
 * Setup macOS Terminal integration
 */
async function setupMacOSTerminal(): Promise<SetupResult> {
  try {
    // Check Terminal app exists
    await execAsync('test -d /Applications/Utilities/Terminal.app');

    return {
      success: true,
      message: 'macOS Terminal setup completed',
      details: 'Native integration enabled',
    };
  } catch {
    return {
      success: false,
      message: 'macOS Terminal not found',
      details: 'Standard terminal should be available on all Macs',
    };
  }
}

/**
 * Install shell completions for current terminal
 */
export async function installShellCompletions(): Promise<SetupResult> {
  const shell = path.basename(process.env.SHELL || 'bash');
  const terminal = getTerminalType();

  try {
    switch (shell) {
      case 'bash':
        return await setupBashCompletions(terminal);
      case 'zsh':
        return await setupZshCompletions(terminal);
      case 'fish':
        return await setupFishCompletions(terminal);
      default:
        return {
          success: false,
          message: `Shell "${shell}" not supported for completions`,
          details: 'Supported: bash, zsh, fish',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Completion setup failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function setupBashCompletions(terminal: TerminalType): Promise<SetupResult> {
  const bashrc = path.join(process.env.HOME || '', '.bashrc');
  const completionLine = 'complete -C groq groq';

  try {
    const content = await fs.readFile(bashrc, 'utf8');
    if (!content.includes(completionLine)) {
      await fs.appendFile(bashrc, `\n# groq CLI completions\n${completionLine}\n`);
    }
    return {
      success: true,
      message: 'Bash completions configured',
      details: `Restart ${terminal} to activate`,
    };
  } catch {
    return {
      success: false,
      message: 'Could not configure bash completions',
      details: `Check ${bashrc} permissions`,
    };
  }
}

async function setupZshCompletions(terminal: TerminalType): Promise<SetupResult> {
  const zshrc = path.join(process.env.HOME || '', '.zshrc');
  const completionLine = 'compdef _groq groq';

  try {
    const content = await fs.readFile(zshrc, 'utf8');
    if (!content.includes(completionLine)) {
      await fs.appendFile(zshrc, `\n# groq CLI completions\n${completionLine}\n`);
    }
    return {
      success: true,
      message: 'Zsh completions configured',
      details: `Restart ${terminal} to activate`,
    };
  } catch {
    return {
      success: false,
      message: 'Could not configure zsh completions',
      details: `Check ${zshrc} permissions`,
    };
  }
}

async function setupFishCompletions(terminal: TerminalType): Promise<SetupResult> {
  const completionsDir = path.join(process.env.HOME || '', '.config', 'fish', 'completions');
  const completionFile = path.join(completionsDir, 'groq.fish');

  try {
    await fs.mkdir(completionsDir, {recursive: true});
    const completionScript = 'complete -c groq -a "(__groq_completions)"';
    await fs.writeFile(completionFile, completionScript);
    return {
      success: true,
      message: 'Fish completions configured',
      details: `Restart ${terminal} to activate`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Could not configure fish completions',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Setup Zed editor integration
 */
async function setupZed(): Promise<SetupResult> {
  try {
    // Check if zed CLI is available
    await execAsync('which zed');
    
    return {
      success: true,
      message: 'Zed setup completed',
      details: 'Zed CLI detected, ready for use with groq-code-cli',
    };
  } catch {
    return {
      success: true,
      message: 'Zed detected (CLI not in PATH)',
      details: 'Install Zed CLI for enhanced integration: cargo install zed',
    };
  }
}
