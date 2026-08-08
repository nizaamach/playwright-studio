import test from 'node:test';
import assert from 'node:assert/strict';

import { templateDefinitions, createTemplateSteps } from '../src/templates.ts';
import { generateCode } from '../src/generator.ts';
import { validateRecordUrl, suggestTestName, isEditableTarget } from '../src/fast-start.ts';
import { getLocatorQuality } from '../src/locator-quality.ts';

const templateIds = ['login', 'checkout', 'search', 'form'];
const stepTypes = new Set(['navigate', 'click', 'hover', 'focus', 'clear', 'press', 'fill', 'select', 'check', 'upload', 'assert', 'wait', 'screenshot']);

test('defines and creates all four starter templates as valid Step arrays', () => {
  assert.deepEqual(templateDefinitions.map((template) => template.id), templateIds);

  for (const templateId of templateIds) {
    const steps = createTemplateSteps(templateId);

    assert.ok(steps.length > 0, `${templateId} should contain starter steps`);
    assert.equal(new Set(steps.map((step) => step.id)).size, steps.length, `${templateId} step ids should be unique`);
    assert.ok(steps.every((step) => stepTypes.has(step.type)), `${templateId} should only use Step types`);
    assert.ok(steps.every((step) => Object.keys(step).every((key) => ['id', 'type', 'selector', 'locatorType', 'role', 'url', 'value', 'options', 'assertion', 'timeout'].includes(key))));
  }
});

test('template steps contain useful end-to-end actions', () => {
  assert.deepEqual(createTemplateSteps('login').map((step) => step.type), ['navigate', 'fill', 'fill', 'click', 'assert']);
  assert.ok(createTemplateSteps('checkout').some((step) => step.type === 'select'));
  assert.ok(createTemplateSteps('search').some((step) => step.type === 'press'));
  assert.ok(createTemplateSteps('form').some((step) => step.type === 'check'));
});

test('configured templates use local variable tokens while preserving supplied values for generated code', () => {
  const steps = createTemplateSteps('login', {
    baseUrl: 'https://qa.example.com',
    email: 'qa@example.com',
    password: 'secret'
  });

  assert.equal(steps[0].url, '{{baseUrl}}/login');
  assert.equal(steps[1].value, '{{email}}');
  assert.equal(steps[2].value, '{{password}}');
  const code = generateCode('Configured login', steps, {
    baseUrl: 'https://qa.example.com',
    email: 'qa@example.com',
    password: 'secret'
  });
  assert.match(code, /baseUrl: "https:\/\/qa\.example\.com"/);
  assert.match(code, /page\.goto\(testData\.baseUrl \+ "\/login"\)/);
});

test('validates recording URLs and rejects non-http protocols', () => {
  assert.equal(validateRecordUrl(''), 'Enter a URL to start recording.');
  assert.equal(validateRecordUrl('   '), 'Enter a URL to start recording.');
  assert.equal(validateRecordUrl('not a url'), 'Enter a valid http:// or https:// URL.');
  assert.equal(validateRecordUrl('ftp://example.com'), 'Use an http:// or https:// URL.');
  assert.equal(validateRecordUrl('https://example.com/login'), '');
  assert.equal(validateRecordUrl(' http://localhost:3000/ '), '');
});

test('suggests a safe hostname-based test name with a readable fallback', () => {
  assert.equal(suggestTestName('https://app.example.com/login'), 'app-example-com');
  assert.equal(suggestTestName('https://QA-Portal.example.com'), 'qa-portal-example-com');
  assert.equal(suggestTestName('not a url'), 'new-test');
  assert.equal(suggestTestName(''), 'new-test');
});

test('detects editable keyboard shortcut targets', () => {
  assert.equal(isEditableTarget(null), false);
  assert.equal(isEditableTarget({ tagName: 'DIV' }), false);
  assert.equal(isEditableTarget({ tagName: 'input' }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditableTarget({ tagName: 'select' }), true);
  assert.equal(isEditableTarget({ tagName: 'div', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'div', contentEditable: 'true' }), true);
});

test('classifies semantic locators as stable and weak locators as fragile', () => {
  for (const locatorType of ['role', 'label', 'testId', 'placeholder']) {
    assert.deepEqual(getLocatorQuality({ id: locatorType, type: 'click', locatorType, selector: 'Submit', role: locatorType === 'role' ? 'button' : undefined }), {
      level: 'stable',
      label: 'Stable'
    });
  }

  assert.deepEqual(getLocatorQuality({ id: 'text', type: 'click', locatorType: 'text', selector: 'Submit' }), {
    level: 'acceptable',
    label: 'Acceptable'
  });
  assert.equal(getLocatorQuality({ id: 'css', type: 'click', locatorType: 'css', selector: '#submit' }).level, 'fragile');
  assert.equal(getLocatorQuality({ id: 'xpath', type: 'click', locatorType: 'xpath', selector: '//button' }).level, 'fragile');
  assert.equal(getLocatorQuality({ id: 'missing', type: 'click' }).level, 'fragile');
});

test('recommends a stronger role locator only when the step already has role context', () => {
  assert.deepEqual(getLocatorQuality({ id: 'role-suggestion', type: 'click', locatorType: 'css', selector: 'Submit', role: 'button' }), {
    level: 'fragile',
    label: 'Fragile',
    recommendation: { locatorType: 'role', selector: 'Submit' }
  });
  assert.equal(getLocatorQuality({ id: 'no-suggestion', type: 'click', locatorType: 'css', selector: '#submit' }).recommendation, undefined);
});
