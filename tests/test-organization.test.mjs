import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTestFolders, collectTestTags, filterTests } from '../src/test-organization.ts';

test('filters tests by search, tag, and folder without changing ids', () => {
  const tests = [{ id: 'a', name: 'Login', tags: ['smoke'], folder: 'auth' }, { id: 'b', name: 'Checkout', tags: ['regression'], folder: 'shop' }];
  assert.deepEqual(filterTests(tests, { query: 'login', tag: 'smoke', folder: 'auth' }).map((item) => item.id), ['a']);
  assert.deepEqual(collectTestTags(tests), ['regression', 'smoke']);
  assert.deepEqual(collectTestFolders(tests), ['auth', 'shop']);
});
