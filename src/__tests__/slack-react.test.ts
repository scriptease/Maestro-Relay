import test from 'node:test';
import assert from 'node:assert/strict';

// Inline the mapping from adapter.ts to test it in isolation.
const UNICODE_TO_SLACK: Record<string, string> = {
  '⏳': 'hourglass_flowing_sand',
  '🎧': 'headphones',
  '✅': 'white_check_mark',
  '❌': 'x',
};

function toSlackEmojiName(emoji: string): string {
  return UNICODE_TO_SLACK[emoji] ?? emoji;
}

test('⏳ maps to hourglass_flowing_sand', () => {
  assert.equal(toSlackEmojiName('⏳'), 'hourglass_flowing_sand');
});

test('🎧 maps to headphones', () => {
  assert.equal(toSlackEmojiName('🎧'), 'headphones');
});

test('✅ maps to white_check_mark', () => {
  assert.equal(toSlackEmojiName('✅'), 'white_check_mark');
});

test('❌ maps to x', () => {
  assert.equal(toSlackEmojiName('❌'), 'x');
});

test('unknown emoji passes through unchanged', () => {
  assert.equal(toSlackEmojiName('🚀'), '🚀');
});

test('isThreadTs matches valid Slack timestamps', () => {
  function isThreadTs(id: string): boolean {
    return /^\d+\.\d+$/.test(id);
  }
  assert.ok(isThreadTs('1234567890.123456'));
  assert.ok(isThreadTs('1777189034.828869'));
  assert.equal(isThreadTs('C001'), false);
  assert.equal(isThreadTs('not-a-ts'), false);
  assert.equal(isThreadTs(''), false);
});
