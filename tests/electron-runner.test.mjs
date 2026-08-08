import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunCommand, parseRunnerOutput } from '../electron/runner.cjs';

test('builds an isolated Playwright command', () => {
  const result = buildRunCommand('/tmp/run', 'test.spec.ts');
  assert.equal(result.cwd, '/tmp/run');
  assert.deepEqual(result.args, ['playwright', 'test', 'test.spec.ts', '--reporter=json']);
});

test('maps JSON runner output to a passed result', () => {
  assert.equal(parseRunnerOutput('{"status":"passed","durationMs":12}').status, 'passed');
});

test('maps malformed failing output to a failed result', () => {
  assert.equal(parseRunnerOutput('Assertion failed', 1).status, 'failed');
});
