import chalk from 'chalk';

export function printLogo(terminalWidth: number = 80): void {
	const logo = `
      ██████  ██    ██  █████
     ██    ██ ██    ██ ██   ██
     ██    ██ ██    ██ ███████
     ██    ██  ██  ██  ██   ██
      ██████    ████   ██   ██

   ███████  ██████  ███████  ███████
  ██       ██    ██ ██    ██ ██
  ██       ██    ██ ██    ██ ██████
  ██       ██    ██ ██    ██ ██
   ███████  ██████  ███████  ███████
`;

	const logoLines = logo.split('\n');
	const maxLineLength = Math.max(...logoLines.map(line => line.length));
	const padding = Math.max(0, Math.floor((terminalWidth - maxLineLength) / 2));
	const centeredLogo = logoLines
		.map(line => {
			if (line.trim()) {
				return ' '.repeat(padding) + chalk.cyan.bgHex('#0a0e14')(line);
			}
			return line;
		})
		.join('\n');

	console.log(centeredLogo);
}
