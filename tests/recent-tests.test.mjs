import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecentTests } from '../src/recent-tests.ts';

test('returns saved tests newest first and respects the limit', () => {
  const tests = [
    { id: 'old', name: 'Old', updatedAt: '2026-08-01T00:00:00.000Z' },
    { id: 'new', name: 'New', updatedAt: '2026-08-08T00:00:00.000Z' },
    { id: 'middle', name: 'Middle', updatedAt: '2026-08-05T00:00:00.000Z' }
  ];
  assert.deepEqual(getRecentTests(tests, 2).map((item) => item.name), ['New', 'Middle']);
});
