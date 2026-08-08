import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendLocators } from '../src/locator-recommendations.ts';

test('prefers role over brittle css when available', () => {
  const result = recommendLocators({ selector: '.save', locatorType: 'css', role: 'button' }, { status: 'available', count: 1 });
  assert.equal(result[0].locatorType, 'role');
});
