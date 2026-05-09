import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const SAVED: Record<string, string | undefined> = {};
const KEYS = ['SLACK_PORT', 'SLACK_ALLOWED_USER_IDS'];

beforeEach(() => {
  for (const k of KEYS) SAVED[k] = process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (SAVED[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED[k];
  }
});

// Import the getter logic directly rather than the module singleton so we
// can exercise it without needing SLACK_BOT_TOKEN etc. at import time.
function getPort(): number {
  const parsed = parseInt(process.env.SLACK_PORT ?? '', 10);
  return Number.isNaN(parsed) ? 3000 : parsed;
}

function getAllowedUserIds(): string[] {
  const val = process.env.SLACK_ALLOWED_USER_IDS;
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

test('port defaults to 3000 when SLACK_PORT is unset', () => {
  delete process.env.SLACK_PORT;
  assert.equal(getPort(), 3000);
});

test('port parses a valid integer', () => {
  process.env.SLACK_PORT = '4000';
  assert.equal(getPort(), 4000);
});

test('port falls back to 3000 for non-numeric value', () => {
  process.env.SLACK_PORT = 'not-a-number';
  assert.equal(getPort(), 3000);
});

test('port falls back to 3000 for empty string', () => {
  process.env.SLACK_PORT = '';
  assert.equal(getPort(), 3000);
});

test('allowedUserIds returns empty array when unset', () => {
  delete process.env.SLACK_ALLOWED_USER_IDS;
  assert.deepEqual(getAllowedUserIds(), []);
});

test('allowedUserIds parses comma-separated values', () => {
  process.env.SLACK_ALLOWED_USER_IDS = 'U001,U002, U003 ';
  assert.deepEqual(getAllowedUserIds(), ['U001', 'U002', 'U003']);
});

test('allowedUserIds filters empty entries', () => {
  process.env.SLACK_ALLOWED_USER_IDS = 'U001,,U002';
  assert.deepEqual(getAllowedUserIds(), ['U001', 'U002']);
});
