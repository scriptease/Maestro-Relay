import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentChannelName } from '../providers/slack/adapter';

test('builds maestro-<sanitized>-<idprefix> from a clean name', () => {
  const out = buildAgentChannelName({ id: 'abcd1234efgh', name: 'My Agent' });
  assert.equal(out, 'maestro-my-agent-abcd1234');
});

test('lowercases, strips disallowed characters, and collapses dashes', () => {
  const out = buildAgentChannelName({ id: 'abcd1234', name: 'Foo!! Bar??' });
  assert.equal(out, 'maestro-foo-bar-abcd1234');
});

test('different agents with the same normalized name get different channel names', () => {
  const a = buildAgentChannelName({ id: 'abcd1234', name: 'My Agent' });
  const b = buildAgentChannelName({ id: 'wxyz9876', name: 'My Agent' });
  assert.notEqual(a, b);
  assert.equal(a, 'maestro-my-agent-abcd1234');
  assert.equal(b, 'maestro-my-agent-wxyz9876');
});

test('falls back to "agent" when the sanitized name is empty', () => {
  const out = buildAgentChannelName({ id: 'abcd1234', name: '!!!' });
  assert.equal(out, 'maestro-agent-abcd1234');
});

test('caps overall length at 80 characters', () => {
  const out = buildAgentChannelName({
    id: 'abcd1234',
    name: 'a'.repeat(200),
  });
  assert.ok(out.length <= 80, `expected <=80, got ${out.length}`);
  assert.match(out, /^maestro-/);
});

test('strips leading and trailing dashes from the sanitized name', () => {
  const out = buildAgentChannelName({ id: 'abcd1234', name: '!!!agent!!!' });
  assert.equal(out, 'maestro-agent-abcd1234');
});

test('handles agent.id with non-alphanumeric characters in the suffix', () => {
  const out = buildAgentChannelName({ id: 'a-b-c-d-1-2-3-4-5', name: 'My Agent' });
  assert.equal(out, 'maestro-my-agent-abcd1234');
});
