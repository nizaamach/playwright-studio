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
  for (const expected of ['page.goto', '.click()', '.getByTestId("submit").click()', "page.locator('xpath=' +", '//button[@type=', '.hover()', '.focus()', '.clear()', '.press("Enter")', '.fill(', '.selectOption(', '.check()', '.setInputFiles(', 'toContainText(', '.toBeEnabled()', '.toHaveCount(3)', '.toHaveAttribute("aria-label", "Email")', 'waitForTimeout(250)', 'page.screenshot']) assert.match(output, new RegExp(expected.replace(/[()[\].]/g, '\\$&')));
});
test('generated output imports Playwright test and expect', () => { assert.match(generateCode('test', []), /import \{ test, expect \} from '@playwright\/test'/); });
test('generates visibility and checked assertions', () => {
  const output = generateCode('assertions', [
    { id: 'a', type: 'assert', selector: '[data-ready]', locatorType: 'css', assertion: 'visible' },
    { id: 'b', type: 'assert', selector: '#agree', locatorType: 'css', assertion: 'checked' }
  ]);
  assert.match(output, /toBeVisible/);
  assert.match(output, /toBeChecked/);
});
