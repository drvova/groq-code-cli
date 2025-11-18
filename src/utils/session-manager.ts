import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionStats {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	totalRequests: number;
	totalTime: number;
}

export interface Session {
	id: string;
	name: string;
	timestamp: number;
	messageCount: number;
	agentMessages: any[];
	uiMessages: any[];
	stats: SessionStats;
	provider: string;
	model: string;
	contextSnapshot?: string;
	contextPath?: string;
}

export interface SessionMetadata {
	id: string;
	name: string;
	timestamp: number;
	messageCount: number;
	provider: string;
	model: string;
	totalTokens: number;
}

const CONFIG_DIR = '.groq';
const SESSIONS_DIR = 'sessions';

export class SessionManager {
	private sessionsDir: string;
	private indexPath: string;

	constructor() {
		const homeDir = os.homedir();
		this.sessionsDir = path.join(homeDir, CONFIG_DIR, SESSIONS_DIR);
		this.indexPath = path.join(this.sessionsDir, 'index.json');
	}

	private ensureSessionsDir(): void {
		if (!fs.existsSync(this.sessionsDir)) {
			fs.mkdirSync(this.sessionsDir, {recursive: true, mode: 0o700});
		}
	}

	private readIndex(): SessionMetadata[] {
		try {
			if (!fs.existsSync(this.indexPath)) {
				return [];
			}
			const indexData = fs.readFileSync(this.indexPath, 'utf8');
			return JSON.parse(indexData);
		} catch (error) {
			console.warn('Failed to read sessions index:', error);
			return [];
		}
	}

	private writeIndex(index: SessionMetadata[]): void {
		this.ensureSessionsDir();
		fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), {
			mode: 0o600,
		});
		try {
			fs.chmodSync(this.indexPath, 0o600);
		} catch {
			// noop on Windows
		}
	}

	private getSessionPath(sessionId: string): string {
		return path.join(this.sessionsDir, `${sessionId}.json`);
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	public saveSession(
		name: string,
		agentMessages: any[],
		uiMessages: any[],
		stats: SessionStats,
		provider: string,
		model: string,
		contextSnapshot?: string,
		contextPath?: string,
	): string {
		const sessionId = this.generateSessionId();
		const session: Session = {
			id: sessionId,
			name,
			timestamp: Date.now(),
			messageCount: uiMessages.length,
			agentMessages,
			uiMessages,
			stats,
			provider,
			model,
			contextSnapshot,
			contextPath,
		};

		this.ensureSessionsDir();
		const sessionPath = this.getSessionPath(sessionId);
		fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), {
			mode: 0o600,
		});
		try {
			fs.chmodSync(sessionPath, 0o600);
		} catch {
			// noop on Windows
		}

		const index = this.readIndex();
		const metadata: SessionMetadata = {
			id: sessionId,
			name,
			timestamp: session.timestamp,
			messageCount: session.messageCount,
			provider,
			model,
			totalTokens: stats.totalTokens,
		};
		index.push(metadata);
		this.writeIndex(index);

		return sessionId;
	}

	public listSessions(): SessionMetadata[] {
		const index = this.readIndex();
		return index.sort((a, b) => b.timestamp - a.timestamp);
	}

	public getSession(sessionId: string): Session | null {
		try {
			const sessionPath = this.getSessionPath(sessionId);
			if (!fs.existsSync(sessionPath)) {
				return null;
			}
			const sessionData = fs.readFileSync(sessionPath, 'utf8');
			return JSON.parse(sessionData);
		} catch (error) {
			console.warn('Failed to load session:', error);
			return null;
		}
	}

	public findSessionByName(name: string): Session | null {
		const index = this.readIndex();
		const metadata = index.find(
			s => s.name.toLowerCase() === name.toLowerCase(),
		);
		if (!metadata) return null;
		return this.getSession(metadata.id);
	}

	public deleteSession(sessionId: string): boolean {
		try {
			const sessionPath = this.getSessionPath(sessionId);
			if (fs.existsSync(sessionPath)) {
				fs.unlinkSync(sessionPath);
			}

			const index = this.readIndex();
			const newIndex = index.filter(s => s.id !== sessionId);
			this.writeIndex(newIndex);

			return true;
		} catch (error) {
			console.warn('Failed to delete session:', error);
			return false;
		}
	}

	public renameSession(sessionId: string, newName: string): boolean {
		try {
			const session = this.getSession(sessionId);
			if (!session) return false;

			session.name = newName;
			const sessionPath = this.getSessionPath(sessionId);
			fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), {
				mode: 0o600,
			});

			const index = this.readIndex();
			const metadata = index.find(s => s.id === sessionId);
			if (metadata) {
				metadata.name = newName;
				this.writeIndex(index);
			}

			return true;
		} catch (error) {
			console.warn('Failed to rename session:', error);
			return false;
		}
	}
}
