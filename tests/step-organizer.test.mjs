import test from 'node:test';
import assert from 'node:assert/strict';

import { getStepGroup, matchesStepQuery } from '../src/step-organizer.ts';

const step = (overrides = {}) => ({ id: 'step-1', type: 'click', selector: 'Submit', ...overrides });

test('assigns deterministic default groups by step intent', () => {
  assert.equal(getStepGroup(step({ type: 'navigate', url: 'https://example.com' })), 'Setup');
  assert.equal(getStepGroup(step({ type: 'fill', selector: 'Email', value: '{{email}}' })), 'Login');
  assert.equal(getStepGroup(step({ type: 'click', selector: 'Add to cart' })), 'Action');
  assert.equal(getStepGroup(step({ type: 'assert', assertion: 'visible' })), 'Assertion');
  assert.equal(getStepGroup(step({ type: 'screenshot', value: 'artifacts/home.png' })), 'Cleanup');
});

test('preserves an explicitly selected group', () => {
  assert.equal(getStepGroup(step({ type: 'click', group: 'Login' })), 'Login');
  assert.equal(getStepGroup(step({ type: 'click', group: 'not-a-group' })), 'Action');
});

test('matches queries across fields case-insensitively', () => {
  const current = step({ type: 'fill', locatorType: 'label', selector: 'Email address', value: '{{email}}', group: 'Login' });
  assert.equal(matchesStepQuery(current, 'EMAIL'), true);
  assert.equal(matchesStepQuery(current, 'label login'), true);
  assert.equal(matchesStepQuery(current, 'password'), false);
  assert.equal(matchesStepQuery(current, '  '), true);
});

