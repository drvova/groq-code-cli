import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../utils/local-settings.js';
import { SessionManager } from '../utils/session-manager.js';

const TEST_DIR_BASE = path.join(os.tmpdir(), 'groq-cli-utils-test');

function createTestDir() {
    const dir = path.join(TEST_DIR_BASE, Math.random().toString(36).slice(2));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cleanupTestDir(dir: string) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        // ignore
    }
}

test('ConfigManager: saves and retrieves API key', t => {
    const testDir = createTestDir();
    try {
        const config = new ConfigManager(testDir);
        t.is(config.getApiKey(), null);

        config.setApiKey('test-key');
        t.is(config.getApiKey(), 'test-key');

        // Verify persistence
        const config2 = new ConfigManager(testDir);
        t.is(config2.getApiKey(), 'test-key');

        config.clearApiKey();
        t.is(config.getApiKey(), null);
    } finally {
        cleanupTestDir(testDir);
    }
});

test('ConfigManager: manages MCP servers', t => {
    const testDir = createTestDir();
    try {
        const config = new ConfigManager(testDir);
        
        config.setMCPServer('test-server', {
            type: 'stdio',
            command: 'echo',
            args: ['hello']
        });

        const servers = config.getMCPServers();
        t.truthy(servers['test-server']);
        t.is(servers['test-server'].type, 'stdio');

        config.toggleMCPServer('test-server');
        t.true(config.getMCPServers()['test-server'].disabled);

        config.removeMCPServer('test-server');
        t.falsy(config.getMCPServers()['test-server']);
    } finally {
        cleanupTestDir(testDir);
    }
});

test('SessionManager: saves and retrieves sessions', t => {
    const testDir = createTestDir();
    try {
        const manager = new SessionManager(testDir);
        
        const sessionId = manager.saveSession(
            'Test Session',
            [{ role: 'user', content: 'hi' }],
            [{ role: 'user', content: 'hi' }],
            {
                promptTokens: 10,
                completionTokens: 10,
                totalTokens: 20,
                totalRequests: 1,
                totalTime: 100
            },
            'groq',
            'llama3'
        );

        t.truthy(sessionId);
        const session = manager.getSession(sessionId);
        t.truthy(session);
        t.is(session?.name, 'Test Session');
        t.is(session?.stats.totalTokens, 20);

        const sessions = manager.listSessions();
        t.is(sessions.length, 1);
        t.is(sessions[0].id, sessionId);

        const deleted = manager.deleteSession(sessionId);
        t.true(deleted);
        t.is(manager.listSessions().length, 0);
    } finally {
        cleanupTestDir(testDir);
    }
});
