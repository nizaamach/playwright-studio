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

test('keeps the generated spec path relative to the project root', () => {
  const result = buildRunCommand('/project', 'tests/playwright-studio-runs/run-1/test.spec.ts');
  assert.equal(result.cwd, '/project');
  assert.equal(result.args[2], 'tests/playwright-studio-runs/run-1/test.spec.ts');
});

test('can use the Studio Playwright binary without npx', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/node_modules/.bin/playwright');
  assert.equal(result.command, '/studio/node_modules/.bin/playwright');
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json']);
});
