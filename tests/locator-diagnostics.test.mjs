import test from 'node:test';
import assert from 'node:assert/strict';

const { countLocator } = await import('../electron/recorder.cjs');

test('locator diagnostics safely report unavailable without an active recorder', async () => {
  const result = await countLocator(null, 'css', '#submit');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.count, null);
  assert.match(result.message, /Start recording/);
});

test('locator diagnostics validate strategy, selector, and role inputs', async () => {
  assert.equal((await countLocator(null, 'unknown', '#submit')).message, 'Unsupported locator strategy.');
  assert.equal((await countLocator(null, 'css', '')).message, 'A locator value is required.');
  assert.equal((await countLocator(null, 'role', 'Submit')).message, 'A role is required for role locators.');
});
