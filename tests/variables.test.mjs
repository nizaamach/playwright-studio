import test from 'node:test';
import assert from 'node:assert/strict';

import { extractVariables, replaceVariables } from '../src/variables.ts';
import { createTemplateSteps, templateDefinitions } from '../src/templates.ts';
import { generateCode } from '../src/generator.ts';

const variables = {
  baseUrl: 'https://qa.example.test',
  email: 'qa@example.test',
  password: 'secret'
};

test('extracts unique variable names in source order', () => {
  assert.deepEqual(
    extractVariables('Open {{baseUrl}} as {{email}}, then reuse {{baseUrl}} and {{ password }}.'),
    ['baseUrl', 'email', 'password']
  );
});

test('replaces known variables and preserves unresolved tokens', () => {
  assert.equal(
    replaceVariables('Hello {{name}}. Missing: {{unknown}}.', { name: 'QA' }),
    'Hello QA. Missing: {{unknown}}.'
  );
});

test('keeps an unresolved token when its value is undefined', () => {
  assert.equal(replaceVariables('{{email}}/{{password}}', { email: 'qa@example.test', password: undefined }), 'qa@example.test/{{password}}');
});

test('defines required configuration variables for each template', () => {
  assert.deepEqual(templateDefinitions.find((template) => template.id === 'login').requiredVariables, ['baseUrl', 'email', 'password']);
  assert.deepEqual(templateDefinitions.find((template) => template.id === 'checkout').requiredVariables, ['baseUrl']);
});

test('configures template steps with local variable tokens', () => {
  const steps = createTemplateSteps('login', variables);

  assert.equal(steps[0].url, '{{baseUrl}}/login');
  assert.equal(steps[1].value, '{{email}}');
  assert.equal(steps[2].value, '{{password}}');
});

test('generates a deterministic testData declaration and references variables', () => {
  const steps = createTemplateSteps('login', variables);
  const output = generateCode('login flow', steps, variables);

  assert.match(output, /const testData = \{\n  baseUrl: "https:\/\/qa\.example\.test",\n  email: "qa@example\.test",\n  password: "secret"\n\};/);
  assert.match(output, /page\.goto\(testData\.baseUrl \+ "\/login"\)/);
  assert.match(output, /\.fill\(testData\.email\)/);
  assert.match(output, /\.fill\(testData\.password\)/);
});

test('keeps the existing generator output shape when variables are omitted', () => {
  const output = generateCode('plain flow', [{ id: '1', type: 'navigate', url: 'https://example.com' }]);

  assert.doesNotMatch(output, /testData/);
  assert.match(output, /page\.goto\("https:\/\/example\.com"\)/);
});
