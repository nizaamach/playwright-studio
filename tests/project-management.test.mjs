import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const { deleteStudioTest, discoverProjectContext, discoverTests, renameStudioTest } = await import('../electron/project.cjs');

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'playwright-studio-'));
  await mkdir(path.join(root, '.playwright-studio', 'tests'), { recursive: true });
  await mkdir(path.join(root, 'e2e', 'nested'), { recursive: true });
  await writeFile(path.join(root, 'playwright.config.ts'), `export default {
    testDir: './e2e',
    use: { baseURL: 'http://localhost:3000' },
    projects: [
      { name: 'chromium', use: { browserName: 'chromium' } },
      { name: "firefox", use: { browserName: 'firefox' } }
    ]
  };\n`);
  await writeFile(path.join(root, '.playwright-studio', 'tests', 'test-1.steps.json'), JSON.stringify({ id: 'test-1', name: 'Login flow', steps: [], generatedCode: "import { test } from '@playwright/test';\ntest(\"Login flow\", async () => {});\n" }));
  await writeFile(path.join(root, '.playwright-studio', 'tests', 'test-1.spec.ts'), "import { test } from '@playwright/test';\ntest(\"Login flow\", async () => {});\n");
  await writeFile(path.join(root, 'e2e', 'nested', 'checkout.spec.ts'), "import { test } from '@playwright/test';\ntest(\"Checkout\", async () => {});\n");
  return root;
}

test('discovers editable Studio tests and existing read-only specs', async () => {
  const root = await fixture();
  try {
    const result = await discoverTests(root);
    assert.equal(result.testDir, './e2e');
    assert.equal(result.baseURL, 'http://localhost:3000');
    assert.deepEqual(result.projects, ['chromium', 'firefox']);
    assert.equal(result.tests.filter((item) => item.source === 'studio').length, 1);
    assert.equal(result.tests.filter((item) => item.readOnly).length, 1);
    assert.equal(result.tests.find((item) => item.readOnly).name, 'checkout');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('imports static project context without executing the config', async () => {
  const root = await fixture();
  try {
    const context = await discoverProjectContext(root);
    assert.deepEqual(context, { testDir: './e2e', baseURL: 'http://localhost:3000', projects: ['chromium', 'firefox'] });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('accepts the baseUrl alias for static project context', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'playwright-studio-baseurl-'));
  try {
    await writeFile(path.join(root, 'playwright.config.ts'), "export default { use: { baseUrl: `http://localhost:4000` } };\n");
    assert.deepEqual(await discoverProjectContext(root), { testDir: 'tests', baseURL: 'http://localhost:4000' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('falls back safely when project config values are dynamic', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'playwright-studio-dynamic-'));
  try {
    await writeFile(path.join(root, 'playwright.config.ts'), `const testDir = process.env.TEST_DIR;
const baseURL = process.env.BASE_URL;
export default { testDir, use: { baseURL }, projects: getProjects() };\n`);
    assert.deepEqual(await discoverProjectContext(root), { testDir: 'tests' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('rename updates metadata and generated code together', async () => {
  const root = await fixture();
  try {
    const renamed = await renameStudioTest(root, 'test-1', 'Checkout login');
    assert.equal(renamed.name, 'Checkout login');
    assert.match(await readFile(path.join(root, '.playwright-studio', 'tests', 'test-1.spec.ts'), 'utf8'), /test\("Checkout login"/);
    assert.equal(JSON.parse(await readFile(path.join(root, '.playwright-studio', 'tests', 'test-1.steps.json'), 'utf8')).name, 'Checkout login');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('delete removes both Studio files', async () => {
  const root = await fixture();
  try {
    await deleteStudioTest(root, 'test-1');
    await assert.rejects(readFile(path.join(root, '.playwright-studio', 'tests', 'test-1.steps.json')));
    await assert.rejects(readFile(path.join(root, '.playwright-studio', 'tests', 'test-1.spec.ts')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('existing specs stay read-only', async () => {
  const root = await fixture();
  try {
    const existingPath = path.join(root, 'e2e', 'nested', 'checkout.spec.ts');
    const before = await readFile(existingPath, 'utf8');
    const discovered = await discoverTests(root);
    const existing = discovered.tests.find((item) => item.readOnly);
    await assert.rejects(() => renameStudioTest(root, existing.id, 'Should not change'));
    await assert.rejects(() => deleteStudioTest(root, existing.id));
    assert.equal(await readFile(existingPath, 'utf8'), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});
