import test from 'node:test';
import assert from 'node:assert/strict';
import { importSpec } from '../src/importer.ts';

test('imports common Playwright actions', () => {
  const result = importSpec("await page.goto('https://example.com');\nawait page.getByRole('button', { name: 'Save' }).click();\nawait page.waitForTimeout(100);");
  assert.equal(result.steps.map((step) => step.type).join(','), 'navigate,click,wait');
  assert.equal(result.warnings.length, 0);
});

test('reports unsupported statements with line numbers', () => {
  const result = importSpec('await page.goto(\'https://example.com\');\nawait page.evaluate(() => window.scrollTo(0, 0));');
  assert.equal(result.warnings[0].line, 2);
});
