import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunCommand, buildRunEnvironment, parseRunnerOutput, prepareRunSource } from '../electron/runner.cjs';

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

test('normalizes Windows spec paths for Playwright regex matching', () => {
  const result = buildRunCommand('D:/project', 'tests\\playwright-studio-runs\\run-1\\test.spec.ts');
  assert.equal(result.args[2], 'tests/playwright-studio-runs/run-1/test.spec.ts');
});

test('can use the Studio Playwright binary without npx', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/node_modules/.bin/playwright');
  assert.equal(result.command, '/studio/node_modules/.bin/playwright');
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json']);
});

test('adds headed mode when requested', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/playwright', { headed: true });
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json', '--headed']);
});

test('keeps runs headless when headed is not enabled', () => {
  const result = buildRunCommand('/project', 'tests/run/test.spec.ts', '/studio/playwright', { headed: false });
  assert.deepEqual(result.args, ['test', 'tests/run/test.spec.ts', '--reporter=json']);
});

test('forces the headless fixture for omitted and invalid headed values', () => {
  for (const headed of [undefined, false, 'true', 1, null]) {
    assert.match(prepareRunSource('test("example", async () => {});', { headed }), /use\(\{ headless: true \}\)/);
  }
});

test('leaves headed source unchanged when explicitly requested', () => {
  const source = 'test("example", async () => {});';
  assert.equal(prepareRunSource(source, { headed: true }), source);
});

test('overrides inherited and requested PWDEBUG for deterministic runs', () => {
  assert.equal(buildRunEnvironment({ PWDEBUG: '1', OTHER: 'value' }, { headed: false }).PWDEBUG, '0');
  assert.equal(buildRunEnvironment({ PWDEBUG: '1' }, { headed: true }).PWDEBUG, '0');
});
