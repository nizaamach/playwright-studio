import test from 'node:test';
import assert from 'node:assert/strict';
import { canRun, normalizeRunResult, runLabel } from '../src/runner.ts';

test('normalizes a passing run with artifacts', () => {
  assert.deepEqual(normalizeRunResult({ status: 'passed', durationMs: 42, stdout: 'ok', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }] }), {
    status: 'passed', durationMs: 42, stdout: 'ok', stderr: '', error: '', artifacts: [{ kind: 'trace', path: '/tmp/a.zip' }],
    report: { file: '', total: 0, passed: 0, failed: 0, skipped: 0 }
  });
});

test('normalizes a Playwright JSON report summary', () => {
  const result = normalizeRunResult({
    status: 'failed',
    stats: { expected: 2, unexpected: 1, skipped: 1, flaky: 1 },
    suites: [{
      specs: [{
        file: 'tests/checkout.spec.ts',
        tests: [{ results: [{ errors: [{ location: { file: 'tests/checkout.spec.ts', line: 24, column: 9 } }] }] }]
      }]
    }]
  });

  assert.deepEqual(result.report, {
    file: 'tests/checkout.spec.ts', total: 5, passed: 3, failed: 1, skipped: 1,
    errorLocation: { file: 'tests/checkout.spec.ts', line: 24, column: 9 }
  });
});

test('normalizes missing and malformed report fields safely', () => {
  assert.deepEqual(normalizeRunResult({
    stats: { expected: '2', unexpected: Infinity, skipped: null, flaky: -1 },
    suites: [{}],
    errors: [{ location: { file: 42, line: '3', column: NaN } }]
  }).report, { file: '', total: 0, passed: 0, failed: 0, skipped: 0 });
});

test('normalizes fractional and overflowing report counts safely', () => {
  assert.deepEqual(normalizeRunResult({
    stats: { expected: 1.5, unexpected: 2, skipped: 0, flaky: 0 }
  }).report, { file: '', total: 2, passed: 0, failed: 2, skipped: 0 });

  assert.deepEqual(normalizeRunResult({
    stats: { expected: Number.MAX_VALUE, unexpected: Number.MAX_VALUE, skipped: Number.MAX_VALUE, flaky: Number.MAX_VALUE }
  }).report, { file: '', total: 0, passed: 0, failed: 0, skipped: 0 });

  assert.deepEqual(normalizeRunResult({
    stats: { expected: Number.MAX_SAFE_INTEGER, unexpected: Number.MAX_SAFE_INTEGER, skipped: 0, flaky: 0 }
  }).report, { file: '', total: 0, passed: 0, failed: 0, skipped: 0 });
});

test('normalizes malformed failures safely', () => {
  const result = normalizeRunResult({ status: 'failed', error: { message: 'boom' } });
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'boom');
  assert.equal(result.stderr, '');
});

test('normalizes nested Playwright errors and failed-only locations', () => {
  const payload = {
    status: 'failed',
    suites: [{ specs: [{ tests: [{ results: [{ errors: [{ message: 'Expected checkout to succeed', location: { file: 'tests/checkout.spec.ts', line: 24, column: 9 } }] }] }] }] }]
  };
  const failed = normalizeRunResult(payload);
  assert.equal(failed.error, 'Expected checkout to succeed');
  assert.deepEqual(failed.report.errorLocation, { file: 'tests/checkout.spec.ts', line: 24, column: 9 });

  const passed = normalizeRunResult({ ...payload, status: 'passed' });
  assert.equal(passed.report.errorLocation, undefined);
});

test('normalizes failed test details in report order', () => {
  const result = normalizeRunResult({
    status: 'failed',
    suites: [{ specs: [{ file: 'tests/login.spec.ts', title: 'login', tests: [
      { title: 'valid credentials', results: [{ errors: [{ message: 'Expected dashboard', location: { file: 'tests/login.spec.ts', line: 12, column: 5 } }] }] },
      { title: 'invalid password', results: [{ errors: [{ message: 'Expected error message' }] }] }
    ] }] }]
  });
  assert.deepEqual(result.report.failures, [
    { title: 'valid credentials', message: 'Expected dashboard', location: { file: 'tests/login.spec.ts', line: 12, column: 5 } },
    { title: 'invalid password', message: 'Expected error message' }
  ]);
});

test('normalizes nested failure messages and ignores malformed errors', () => {
  const result = normalizeRunResult({
    status: 'failed',
    suites: [null, {}, { specs: [{ file: 'tests/a.spec.ts', tests: [
      { results: [{ errors: [null, {}, { error: { message: 'Useful inner message' }, location: { file: '' } }, { message: '   ' }] }] },
      { results: 'malformed' }
    ] }] }, { suites: [{ specs: [{ title: 'nested spec', tests: [{ title: '', results: [{ errors: [{ message: 'Nested failure' }] }] }] }] }] }]
  });
  assert.deepEqual(result.report.failures, [
    { title: 'tests/a.spec.ts', message: 'Useful inner message' },
    { title: 'nested spec', message: 'Nested failure' }
  ]);
});

test('does not expose failures for stopped runs', () => {
  const result = normalizeRunResult({
    status: 'stopped',
    suites: [{ specs: [{ title: 'stopped test', tests: [{ results: [{ errors: [{ message: 'Should not show' }] }] }] }] }]
  });
  assert.equal(result.report.failures, undefined);
});

test('drops invalid error location coordinates', () => {
  assert.deepEqual(normalizeRunResult({
    status: 'failed',
    errors: [{ location: { file: 'tests/checkout.spec.ts', line: 0, column: Number.MAX_SAFE_INTEGER + 1 } }]
  }).report.errorLocation, { file: 'tests/checkout.spec.ts' });
});

test('only allows valid editable desktop tests to run', () => {
  assert.equal(canRun({ readOnly: true, hasErrors: false, hasStudio: true, status: 'idle' }), false);
  assert.equal(canRun({ readOnly: false, hasErrors: false, hasStudio: true, status: 'idle' }), true);
  assert.equal(canRun({ readOnly: false, hasErrors: true, hasStudio: true, status: 'idle' }), false);
});

test('run label reflects status', () => assert.equal(runLabel('running'), 'Running…'));
