import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCode } from '../src/generator.ts';

const steps = [
  { id: '1', type: 'navigate', url: 'https://example.com' },
  { id: '2', type: 'click', selector: '[data-testid="submit"]' },
  { id: '2b', type: 'click', locatorType: 'testId', selector: 'submit' },
  { id: '2c', type: 'click', locatorType: 'xpath', selector: '//button[@type="submit"]' },
  { id: '2d', type: 'hover', selector: '.menu' },
  { id: '2e', type: 'focus', selector: '#email' },
  { id: '2f', type: 'clear', selector: '#email' },
  { id: '2g', type: 'press', selector: '#email', value: 'Enter' },
  { id: '3', type: 'fill', selector: '#email', value: 'qa@example.com' },
  { id: '3b', type: 'fill', locatorType: 'label', selector: 'Email', value: 'qa@example.com' },
  { id: '4', type: 'select', selector: '#role', value: 'qa' },
  { id: '5', type: 'check', selector: '#terms' },
  { id: '6', type: 'upload', selector: 'input[type=file]', value: 'fixture.txt' },
  { id: '7', type: 'assert', selector: 'h1', assertion: 'text', value: 'Welcome' },
  { id: '7b', type: 'assert', selector: 'button', assertion: 'enabled' },
  { id: '7c', type: 'assert', selector: 'nav a', assertion: 'count', value: '3' },
  { id: '7d', type: 'assert', selector: 'input', assertion: 'attribute', options: 'aria-label', value: 'Email' },
  { id: '8', type: 'wait', value: '250' },
  { id: '9', type: 'screenshot', value: 'artifacts/home.png' }
];

test('generator produces valid Playwright statements for all MVP action types', () => {
  const output = generateCode('smoke flow', steps);
  for (const expected of ['page.goto', '.click()', '.getByTestId("submit").click()', "page.locator('xpath=' +", '//button[@type=', '.hover()', '.focus()', '.clear()', '.press("Enter")', '.fill(', '.selectOption(', '.check()', '.setInputFiles(', 'toContainText(', '.toBeEnabled()', '.toHaveCount(3)', '.toHaveAttribute("aria-label", "Email")', 'getByLabel("Email", { exact: true })', 'waitForTimeout(250)', 'page.screenshot']) assert.match(output, new RegExp(expected.replace(/[()[\].]/g, '\\$&')));
  assert.equal(output.match(/await test\.step\(/g)?.length, steps.length);
});
test('generated actions have meaningful Playwright step titles', () => {
  const output = generateCode('failure details', [
    { id: 'navigate', type: 'navigate', url: 'https://example.com/checkout' },
    { id: 'click', type: 'click', locatorType: 'role', role: 'button', selector: 'Place order' },
    { id: 'assert', type: 'assert', selector: '.confirmation', assertion: 'text', value: 'Order confirmed' }
  ]);
  assert.match(output, /await test\.step\("Navigate to https:\/\/example\.com\/checkout", async \(\) => \{/);
  assert.match(output, /await test\.step\("Click Place order", async \(\) => \{/);
  assert.match(output, /await test\.step\("Assert text on \.confirmation", async \(\) => \{/);
});
test('generated output imports Playwright test and expect', () => { assert.match(generateCode('test', []), /import \{ test, expect \} from '@playwright\/test'/); });
test('adds a supported extension to screenshot paths', () => {
  assert.match(generateCode('screenshots', [{ id: 'shot', type: 'screenshot', value: '/tmp/Screenshot' }]), /path: "\/tmp\/Screenshot\.png"/);
});
test('uses CSS locators for structural html and body targets', () => {
  const output = generateCode('structure', [
    { id: 'body', type: 'assert', locatorType: 'text', selector: 'body', assertion: 'text', value: 'Invalid email or password!' },
    { id: 'role-body', type: 'assert', locatorType: 'role', role: 'button', selector: 'body', assertion: 'visible' }
  ]);
  assert.match(output, /expect\(page\.locator\("body"\)\)\.toContainText/);
  assert.match(output, /expect\(page\.locator\("body"\)\)\.toBeVisible/);
});
test('generates visibility and checked assertions', () => {
  const output = generateCode('assertions', [
    { id: 'a', type: 'assert', selector: '[data-ready]', locatorType: 'css', assertion: 'visible' },
    { id: 'b', type: 'assert', selector: '#agree', locatorType: 'css', assertion: 'checked' }
  ]);
  assert.match(output, /toBeVisible/);
  assert.match(output, /toBeChecked/);
});
test('reopens a filled combobox before clicking a custom option', () => {
  const output = generateCode('subjects', [
    { id: 'input', type: 'fill', selector: '#subjectsInput', value: 'math' },
    { id: 'option', type: 'click', locatorType: 'role', role: 'option', selector: 'Maths' }
  ]);
  assert.match(output, /page\.locator\("#subjectsInput"\)\.click\(\);\n    await page\.getByRole\("option", \{ name: "Maths" \}\)\.click\(\);/);
});
