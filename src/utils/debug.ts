import * as fs from 'fs';
import * as path from 'path';

const DEBUG_LOG_FILE = path.join(process.cwd(), 'debug-agent.log');
let debugLogCleared = false;
let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
	debugEnabled = enabled;
}

export function debugLog(message: string, data?: any): void {
	if (!debugEnabled) return;

	// Clear log file on first debug log of each session
	if (!debugLogCleared) {
		fs.writeFileSync(DEBUG_LOG_FILE, '');
		debugLogCleared = true;
	}

	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}${
		data ? '\n' + JSON.stringify(data, null, 2) : ''
	}\n`;
	fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
}

export function generateCurlCommand(
	apiKey: string,
	requestBody: any,
	requestCount: number,
): string {
	if (!debugEnabled) return '';

	const maskedApiKey = `${apiKey.substring(0, 8)}...${apiKey.substring(
		apiKey.length - 8,
	)}`;

	// Write request body to JSON file
	const jsonFileName = `debug-request-${requestCount}.json`;
	const jsonFilePath = path.join(process.cwd(), jsonFileName);
	fs.writeFileSync(jsonFilePath, JSON.stringify(requestBody, null, 2));

	const curlCmd = `curl -X POST "https://api.groq.com/openai/v1/chat/completions" \\
  -H "Authorization: Bearer ${maskedApiKey}" \\
  -H "Content-Type: application/json" \\
  -d @${jsonFileName}`;

	return curlCmd;
}
