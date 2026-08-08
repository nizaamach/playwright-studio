import test from 'node:test';
import assert from 'node:assert/strict';

import { History, createHistory } from '../src/history.ts';
import { DRAFT_VERSION, clearDraft, createDraft, parseDraft, readDraft, saveDraft } from '../src/drafts.ts';

test('history respects undo and redo boundaries', () => {
  const history = createHistory({ steps: [] });
  assert.equal(history.canUndo, false);
  assert.equal(history.undo(), null);
  history.push({ steps: ['one'] });
  history.push({ steps: ['one', 'two'] });
  assert.deepEqual(history.undo(), { steps: ['one'] });
  assert.deepEqual(history.undo(), { steps: [] });
  assert.equal(history.undo(), null);
  assert.deepEqual(history.redo(), { steps: ['one'] });
  assert.deepEqual(history.redo(), { steps: ['one', 'two'] });
  assert.equal(history.redo(), null);
});

test('a new history edit clears redo and snapshots stay immutable', () => {
  const history = new History({ steps: ['one'] });
  const next = { steps: ['one', 'two'] };
  history.push(next);
  next.steps.push('mutated outside history');
  assert.deepEqual(history.current, { steps: ['one', 'two'] });
  history.undo();
  history.push({ steps: ['replacement'] });
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.redo(), null);
});

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
};

const testCase = { id: 'test-1', name: 'Draft test', steps: [], generatedCode: '' };

test('drafts serialize and restore a versioned envelope', () => {
  const adapter = storage();
  const envelope = createDraft('/tmp/project', testCase, '2026-08-08T00:00:00.000Z');
  assert.equal(envelope.version, DRAFT_VERSION);
  saveDraft(adapter, envelope);
  assert.deepEqual(readDraft(adapter), envelope);
  clearDraft(adapter);
  assert.equal(readDraft(adapter), null);
});

test('draft parser rejects unsupported versions and malformed data', () => {
  const valid = createDraft('/tmp/project', testCase);
  assert.equal(parseDraft(JSON.stringify({ ...valid, version: DRAFT_VERSION + 1 })), null);
  assert.equal(parseDraft('{not-json'), null);
  assert.equal(parseDraft(JSON.stringify({ ...valid, test: { id: 'missing' } })), null);
  assert.equal(parseDraft(null), null);
});
