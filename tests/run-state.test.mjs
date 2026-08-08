import test from 'node:test';
import assert from 'node:assert/strict';
import { canRun, runLabel } from '../src/runner.ts';

test('run is disabled for an invalid or read-only test', () => {
  assert.equal(canRun({ readOnly: true, hasErrors: false, hasStudio: true, status: 'idle' }), false);
  assert.equal(canRun({ readOnly: false, hasErrors: false, hasStudio: true, status: 'idle' }), true);
});

test('run label reflects status', () => assert.equal(runLabel('running'), 'Running…'));
