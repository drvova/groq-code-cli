import {CommandDefinition, CommandContext} from '../base.js';

export const providerCommand: CommandDefinition = {
	command: 'provider',
	description: 'Select your provider',
	handler: ({setShowProviderSelector}: CommandContext) => {
		if (setShowProviderSelector) {
			setShowProviderSelector(true);
		}
	},
};
