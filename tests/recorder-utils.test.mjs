import test from 'node:test';
import assert from 'node:assert/strict';
import { removeRedundantNavigationSteps } from '../src/recorder-utils.ts';

test('removes navigation emitted immediately after a navigation-causing action', () => {
  const steps = [
    { id: '1', type: 'navigate', url: 'https://example.com' },
    { id: '2', type: 'click', selector: '#login' },
    { id: '3', type: 'navigate', url: 'https://example.com/dashboard' }
  ];
  assert.deepEqual(removeRedundantNavigationSteps(steps).map((step) => step.type), ['navigate', 'click']);
});

test('preserves standalone navigations', () => {
  const steps = [{ id: '1', type: 'navigate', url: 'https://example.com' }, { id: '2', type: 'wait', value: '500' }, { id: '3', type: 'navigate', url: 'https://example.com/next' }];
  assert.equal(removeRedundantNavigationSteps(steps).length, 3);
});
