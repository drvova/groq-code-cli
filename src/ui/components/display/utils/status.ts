/**
 * Centralized status management for display components
 * Constitutional compliance: AMENDMENT III - Single Source of Truth
 */

export type StatusType = 'completed' | 'failed' | 'canceled' | 'pending' | 'in_progress';

export interface StatusConfig {
  icon: string;
  color: string;
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
  completed: { icon: '✓', color: 'green' },
  failed: { icon: '✗', color: 'red' },
  canceled: { icon: '⊗', color: 'gray' },
  pending: { icon: '○', color: 'white' },
  in_progress: { icon: '◐', color: 'blue' },
};

export function getStatusConfig(status: StatusType): StatusConfig {
  return STATUS_MAP[status] || { icon: '?', color: 'white' };
}

export function getStatusIcon(status: StatusType): string {
  return getStatusConfig(status).icon;
}

export function getStatusColor(status: StatusType): string {
  return getStatusConfig(status).color;
}

export interface MCPStatusInfo {
  connectedCount: number;
  totalServers: number;
  hasErrors: boolean;
}

export function getMCPStatusConfig(info: MCPStatusInfo): StatusConfig & { text: string; dimColor?: boolean } {
  const { connectedCount, totalServers, hasErrors } = info;

  if (totalServers === 0) {
    return {
      color: 'gray',
      icon: '',
      text: 'MCP: -',
      dimColor: true,
    };
  }

  if (connectedCount === 0) {
    return {
      color: 'red',
      icon: '',
      text: hasErrors
        ? `MCP: OFF (${totalServers} error${totalServers > 1 ? 's' : ''})`
        : `MCP: OFF (${totalServers} disconnected)`,
    };
  }

  if (connectedCount < totalServers) {
    return {
      color: 'yellow',
      icon: '',
      text: `MCP: ${connectedCount}/${totalServers}`,
    };
  }

  return {
    color: 'green',
    icon: '',
    text: `MCP: ${connectedCount}/${totalServers}`,
  };
}
