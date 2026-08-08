import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecentFiles, touchRecentFile } from '../src/recent-files.ts';

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

test('stores recent files newest first and deduplicates by project and test', () => {
  const store = storage();
  touchRecentFile(store, { projectPath: '/project', testId: 'a', name: 'Old', updatedAt: '2026-08-01T00:00:00.000Z' });
  touchRecentFile(store, { projectPath: '/project', testId: 'b', name: 'New', updatedAt: '2026-08-08T00:00:00.000Z' });
  touchRecentFile(store, { projectPath: '/project', testId: 'a', name: 'Old', updatedAt: '2026-08-09T00:00:00.000Z' });
  assert.deepEqual(readRecentFiles(store).map((item) => item.testId), ['a', 'b']);
});
