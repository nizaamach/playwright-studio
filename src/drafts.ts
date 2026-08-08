import type { TestCase } from './types';

export const DRAFT_VERSION = 1;
export const DRAFT_STORAGE_KEY = 'playwright-studio-draft-v1';

export type DraftEnvelope = {
  version: number;
  savedAt: string;
  projectPath: string;
  test: TestCase;
};

export type DraftStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

const isTestCase = (value: unknown): value is TestCase => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.generatedCode === 'string'
    && Array.isArray(value.steps);
};

export function createDraft(projectPath: string, test: TestCase, savedAt = new Date().toISOString()): DraftEnvelope {
  return { version: DRAFT_VERSION, savedAt, projectPath, test };
}

export function serializeDraft(envelope: DraftEnvelope): string {
  return JSON.stringify(envelope);
}

export function parseDraft(source: string | null): DraftEnvelope | null {
  if (!source) return null;
  try {
    const parsed: unknown = JSON.parse(source);
    if (!isRecord(parsed)
      || parsed.version !== DRAFT_VERSION
      || typeof parsed.savedAt !== 'string'
      || typeof parsed.projectPath !== 'string'
      || !isTestCase(parsed.test)) return null;
    return parsed as unknown as DraftEnvelope;
  } catch {
    return null;
  }
}

export function saveDraft(storage: DraftStorage, envelope: DraftEnvelope): DraftEnvelope;
export function saveDraft(storage: DraftStorage, projectPath: string, test: TestCase, key?: string): DraftEnvelope;
export function saveDraft(storage: DraftStorage, projectPathOrEnvelope: string | DraftEnvelope, test?: TestCase, key = DRAFT_STORAGE_KEY): DraftEnvelope {
  const envelope = typeof projectPathOrEnvelope === 'string'
    ? createDraft(projectPathOrEnvelope, test as TestCase)
    : projectPathOrEnvelope;
  storage.setItem(typeof projectPathOrEnvelope === 'string' ? key : DRAFT_STORAGE_KEY, serializeDraft(envelope));
  return envelope;
}

export function readDraft(storage: DraftStorage, key = DRAFT_STORAGE_KEY): DraftEnvelope | null {
  return parseDraft(storage.getItem(key));
}

export function clearDraft(storage: DraftStorage, key = DRAFT_STORAGE_KEY): void {
  storage.removeItem(key);
}
