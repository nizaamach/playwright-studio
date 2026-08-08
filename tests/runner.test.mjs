import test from 'node:test';
import assert from 'node:assert/strict';
import { canRun, normalizeRunResult, runLabel } from '../src/runner.ts';

test('normalizes a passing run with artifacts', () => {
  assert.deepEqual(normalizeRunResult({ status: 'passed', durationMs: 42, stdout: 'ok', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }] }), {
    status: 'passed', durationMs: 42, stdout: 'ok', stderr: '', error: '', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }]
  });
});

test('normalizes malformed failures safely', () => {
  const result = normalizeRunResult({ status: 'failed', error: { message: 'boom' } });
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'boom');
  assert.equal(result.stderr, '');
});

test('only allows valid editable desktop tests to run', () => {
  assert.equal(canRun({ readOnly: true, hasErrors: false, hasStudio: true, status: 'idle' }), false);
  assert.equal(canRun({ readOnly: false, hasErrors: false, hasStudio: true, status: 'idle' }), true);
  assert.equal(canRun({ readOnly: false, hasErrors: true, hasStudio: true, status: 'idle' }), false);
});

test('run label reflects status', () => assert.equal(runLabel('running'), 'Running…'));
