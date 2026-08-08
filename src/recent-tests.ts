import type { ManagedTest } from './types';

function recency(test: ManagedTest) {
  const updated = test.updatedAt ? Date.parse(test.updatedAt) : NaN;
  if (Number.isFinite(updated)) return updated;
  const createdFromId = Number(test.id.match(/^test-(\d+)$/)?.[1] || 0);
  return Number.isFinite(createdFromId) ? createdFromId : 0;
}

export function getRecentTests(tests: ManagedTest[], limit = 5) {
  return [...tests].sort((left, right) => recency(right) - recency(left)).slice(0, limit);
}
