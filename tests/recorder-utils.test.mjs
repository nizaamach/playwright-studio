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

test('coalesces consecutive fill events for the same locator', () => {
  const steps = [
    { id: '1', type: 'fill', locatorType: 'label', selector: 'Email', value: 'demo' },
    { id: '2', type: 'fill', locatorType: 'label', selector: 'Email', value: 'demo@' },
    { id: '3', type: 'fill', locatorType: 'label', selector: 'Email', value: 'demo@demo.com' },
    { id: '4', type: 'press', locatorType: 'label', selector: 'Email', value: 'Tab' }
  ];
  const result = removeRedundantNavigationSteps(steps);
  assert.deepEqual(result.map((step) => [step.type, step.value]), [['fill', 'demo@demo.com'], ['press', 'Tab']]);
});

test('removes consecutive duplicate navigations for the same URL', () => {
  const steps = [
    { id: '1', type: 'navigate', url: 'https://example.com/' },
    { id: '2', type: 'navigate', url: 'https://example.com/' },
    { id: '3', type: 'navigate', url: 'https://example.com/login' }
  ];
  assert.deepEqual(removeRedundantNavigationSteps(steps).map((step) => step.url), ['https://example.com/', 'https://example.com/login']);
});
