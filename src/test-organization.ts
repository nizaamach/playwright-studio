import type { ManagedTest } from './types';

export type TestFilter = { query?: string; tag?: string; folder?: string };

export function filterTests(tests: ManagedTest[], filter: TestFilter): ManagedTest[] {
  const query = filter.query?.trim().toLowerCase() || '';
  return tests.filter((test) => {
    const searchable = [test.name, test.folder, ...(test.tags || [])].filter(Boolean).join(' ').toLowerCase();
    return (!query || searchable.includes(query)) && (!filter.tag || test.tags?.includes(filter.tag)) && (!filter.folder || test.folder === filter.folder);
  });
}

export function collectTestTags(tests: ManagedTest[]) { return [...new Set(tests.flatMap((test) => test.tags || []))].sort(); }
export function collectTestFolders(tests: ManagedTest[]) { return [...new Set(tests.map((test) => test.folder).filter(Boolean))].sort() as string[]; }
