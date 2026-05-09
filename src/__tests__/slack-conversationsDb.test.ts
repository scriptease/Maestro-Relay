import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

// Build an isolated in-memory DB with the slack_agent_conversations table
// and a minimal agent_channels stub so the shared `db` import isn't needed.
function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE slack_agent_conversations (
      thread_ts     TEXT PRIMARY KEY,
      channel_id    TEXT NOT NULL,
      agent_id      TEXT NOT NULL,
      owner_user_id TEXT,
      session_id    TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  return db;
}

// Inline DAO matching conversationsDb.ts so we test logic without the
// shared singleton DB.
function makeConversationDb(db: ReturnType<typeof Database>) {
  return {
    register(threadTs: string, channelId: string, agentId: string, ownerUserId: string | null) {
      db.prepare(
        `INSERT OR IGNORE INTO slack_agent_conversations (thread_ts, channel_id, agent_id, owner_user_id)
         VALUES (?, ?, ?, ?)`,
      ).run(threadTs, channelId, agentId, ownerUserId);
    },
    get(threadTs: string) {
      return db
        .prepare('SELECT * FROM slack_agent_conversations WHERE thread_ts = ?')
        .get(threadTs) as { thread_ts: string; channel_id: string; agent_id: string; owner_user_id: string | null; session_id: string | null } | undefined;
    },
    updateSession(threadTs: string, sessionId: string | null) {
      db.prepare(
        'UPDATE slack_agent_conversations SET session_id = ? WHERE thread_ts = ?',
      ).run(sessionId, threadTs);
    },
    remove(threadTs: string) {
      db.prepare('DELETE FROM slack_agent_conversations WHERE thread_ts = ?').run(threadTs);
    },
    listByChannel(channelId: string) {
      return db
        .prepare('SELECT * FROM slack_agent_conversations WHERE channel_id = ? ORDER BY created_at DESC')
        .all(channelId) as { thread_ts: string }[];
    },
  };
}

let db: ReturnType<typeof Database>;
let conversationDb: ReturnType<typeof makeConversationDb>;

afterEach(() => {
  db?.close();
});

function setup() {
  db = makeDb();
  conversationDb = makeConversationDb(db);
}

test('register and get round-trip', () => {
  setup();
  conversationDb.register('1234567890.123456', 'C001', 'agent-1', 'U001');
  const row = conversationDb.get('1234567890.123456');
  assert.ok(row);
  assert.equal(row.channel_id, 'C001');
  assert.equal(row.agent_id, 'agent-1');
  assert.equal(row.owner_user_id, 'U001');
  assert.equal(row.session_id, null);
});

test('register is idempotent — duplicate thread_ts does not throw (INSERT OR IGNORE)', () => {
  setup();
  conversationDb.register('1111111111.000001', 'C001', 'agent-1', 'U001');
  assert.doesNotThrow(() => {
    conversationDb.register('1111111111.000001', 'C002', 'agent-2', 'U002');
  });
  // First registration wins
  const row = conversationDb.get('1111111111.000001');
  assert.equal(row?.channel_id, 'C001');
});

test('updateSession persists sessionId', () => {
  setup();
  conversationDb.register('2222222222.000001', 'C001', 'agent-1', 'U001');
  conversationDb.updateSession('2222222222.000001', 'ses_abc123');
  const row = conversationDb.get('2222222222.000001');
  assert.equal(row?.session_id, 'ses_abc123');
});

test('updateSession can clear sessionId to null', () => {
  setup();
  conversationDb.register('3333333333.000001', 'C001', 'agent-1', 'U001');
  conversationDb.updateSession('3333333333.000001', 'ses_xyz');
  conversationDb.updateSession('3333333333.000001', null);
  const row = conversationDb.get('3333333333.000001');
  assert.equal(row?.session_id, null);
});

test('remove deletes the row', () => {
  setup();
  conversationDb.register('4444444444.000001', 'C001', 'agent-1', 'U001');
  conversationDb.remove('4444444444.000001');
  assert.equal(conversationDb.get('4444444444.000001'), undefined);
});

test('listByChannel returns all conversations for a channel', () => {
  setup();
  conversationDb.register('5555555555.000001', 'C-CHAN', 'agent-1', 'U001');
  conversationDb.register('5555555555.000002', 'C-CHAN', 'agent-1', 'U002');
  conversationDb.register('5555555555.000003', 'C-OTHER', 'agent-2', 'U003');
  const rows = conversationDb.listByChannel('C-CHAN');
  assert.equal(rows.length, 2);
});

test('register with null owner does not throw', () => {
  setup();
  assert.doesNotThrow(() => {
    conversationDb.register('6666666666.000001', 'C001', 'agent-1', null);
  });
  const row = conversationDb.get('6666666666.000001');
  assert.equal(row?.owner_user_id, null);
});
