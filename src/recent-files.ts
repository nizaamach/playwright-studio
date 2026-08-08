export type RecentFile = {
  projectPath: string;
  testId: string;
  name: string;
  updatedAt: string;
};

export const recentFilesKey = 'playwright-studio-recent-files';

export function readRecentFiles(storage: Storage | null, limit = 10): RecentFile[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(recentFilesKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentFile => Boolean(item && typeof item.projectPath === 'string' && typeof item.testId === 'string' && typeof item.name === 'string' && typeof item.updatedAt === 'string')).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)).slice(0, limit);
  } catch {
    return [];
  }
}

export function touchRecentFile(storage: Storage | null, file: RecentFile, limit = 10) {
  if (!storage) return [];
  const current = readRecentFiles(storage).filter((item) => !(item.projectPath === file.projectPath && item.testId === file.testId));
  const next = [file, ...current].slice(0, limit);
  try { storage.setItem(recentFilesKey, JSON.stringify(next)); } catch { /* Best effort persistence. */ }
  return next;
}
