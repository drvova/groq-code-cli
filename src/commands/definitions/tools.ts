/**
 * Tools Command - Tool management slash command
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import {CommandDefinition, CommandContext} from '../base.js';

export const toolsCommand: CommandDefinition = {
	command: 'tools',
	description: 'Manage available tools - enable/disable tools to control context bloat',
	handler: ({setShowToolSelector}: CommandContext) => {
		if (setShowToolSelector) {
			setShowToolSelector(true);
		}
	},
};
