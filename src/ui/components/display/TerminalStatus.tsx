/**
 * Terminal Status UI Component
 * Displays current terminal information in the status bar
 * Constitutional compliance: AMENDMENT VII - ELM Architecture
 */

import React from 'react';
import {Text} from 'ink';
import {detectTerminal, getTerminalType} from '../../../utils/terminal-utils.js';

export interface TerminalStatusProps {
  compact?: boolean;
}

/**
 * Get terminal status configuration for display
 */
export function getTerminalStatusConfig(): {
  text: string;
  color: string;
  icon?: string;
} {
  const type = getTerminalType();
  const info = detectTerminal();

  if (!info.isSupported) {
    return {
      text: 'TERM: ???',
      color: 'red',
      icon: '?',
    };
  }

  // Use compact names for status bar
  const compactName = type === 'macos-terminal' ? 'MacTerm' : type;
  const version = info.version ? info.version.split('.').slice(0, 2).join('.') : '';

  // Terminal-specific styling
  switch (type) {
    case 'warp':
      return {
        text: `WARP ${version}`.trim(),
        color: 'magenta',
        icon: '◈',
      };
    case 'iterm2':
      return {
        text: `ITERM ${version}`.trim(),
        color: 'green',
        icon: '◉',
      };
    case 'macos-terminal':
      return {
        text: `MCTERM ${version}`.trim(),
        color: 'blue',
        icon: '○',
      };
    case 'zed':
      return {
        text: `ZED ${version}`.trim(),
        color: 'yellow',
        icon: 'ℤ',
      };
    default:
      return {
        text: 'UNKNOWN',
        color: 'gray',
        icon: '?',
      };
  }
}

/**
 * Terminal Status Component
 * Displays current terminal with colored icon and version info
 */
export function TerminalStatus({compact = true}: TerminalStatusProps): React.ReactElement {
  const config = getTerminalStatusConfig();

  if (compact) {
    return (
      <Text color={config.color}>
        {config.icon && <Text bold>{config.icon} </Text>}
        {config.text}
      </Text>
    );
  }

  return (
    <Text>
      <Text color="gray">Terminal: </Text>
      <Text color={config.color} bold>
        {config.text}
      </Text>
    </Text>
  );
}

/**
 * Get simple status text for minimal displays
 */
export function getTerminalStatusSimple(): string {
  const type = getTerminalType();
  const info = detectTerminal();

  if (!info.isSupported) return 'TERM: ???';
  
  const name = type === 'macos-terminal' ? 'MacTerm' : type;
  return `TERM: ${name.toUpperCase()}`;
}
