export type RunStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export type RunArtifact = { kind: 'screenshot' | 'trace' | 'video'; path: string };
export type RunRequest = { testId: string; source: string; projectPath?: string; testDir?: string; baseURL?: string; environment?: Record<string, string>; headed?: boolean };
export type RunReport = {
  file: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errorLocation?: { file: string; line?: number; column?: number };
};
export type RunResult = {
  status: Exclude<RunStatus, 'idle' | 'queued' | 'running'>;
  durationMs: number;
  stdout: string;
  stderr: string;
  error: string;
  artifacts: RunArtifact[];
  report: RunReport;
};

const artifactKinds = new Set<RunArtifact['kind']>(['screenshot', 'trace', 'video']);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function count(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function location(value: unknown): RunReport['errorLocation'] {
  const candidate = asRecord(value);
  if (!candidate || typeof candidate.file !== 'string') return undefined;
  const line = typeof candidate.line === 'number' && Number.isFinite(candidate.line) ? candidate.line : undefined;
  const column = typeof candidate.column === 'number' && Number.isFinite(candidate.column) ? candidate.column : undefined;
  return { file: candidate.file, ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) };
}

function firstSpec(suites: unknown): Record<string, unknown> | undefined {
  const pending = Array.isArray(suites) ? [...suites] : [];
  while (pending.length) {
    const suite = asRecord(pending.shift());
    if (!suite) continue;
    const spec = Array.isArray(suite.specs) ? suite.specs.map(asRecord).find(Boolean) : undefined;
    if (spec) return spec;
    if (Array.isArray(suite.suites)) pending.push(...suite.suites);
  }
  return undefined;
}

function resultErrorLocation(spec: Record<string, unknown> | undefined) {
  if (!spec || !Array.isArray(spec.tests)) return undefined;
  for (const test of spec.tests) {
    const testRecord = asRecord(test);
    if (!testRecord || !Array.isArray(testRecord.results)) continue;
    for (const result of testRecord.results) {
      const errors = asRecord(result)?.errors;
      if (!Array.isArray(errors)) continue;
      for (const error of errors) {
        const found = location(asRecord(error)?.location);
        if (found) return found;
      }
    }
  }
}

function suiteErrorLocation(suites: unknown) {
  const pending = Array.isArray(suites) ? [...suites] : [];
  while (pending.length) {
    const suite = asRecord(pending.shift());
    if (!suite) continue;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const found = resultErrorLocation(asRecord(spec));
        if (found) return found;
      }
    }
    if (Array.isArray(suite.suites)) pending.push(...suite.suites);
  }
}

export function normalizeRunResult(payload: unknown): RunResult {
  const value = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const status: RunResult['status'] = value.status === 'passed' || value.status === 'stopped' ? value.status : 'failed';
  const rawError = value.error;
  const error = typeof rawError === 'string'
    ? rawError
    : rawError && typeof rawError === 'object' && 'message' in rawError
      ? String(rawError.message)
      : '';
  const artifacts = Array.isArray(value.artifacts)
    ? value.artifacts.filter((item): item is RunArtifact => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.path === 'string' && artifactKinds.has(candidate.kind as RunArtifact['kind']);
    })
    : [];
  const stats = asRecord(value.stats) ?? {};
  const passed = count(stats.expected);
  const failed = count(stats.unexpected);
  const skipped = count(stats.skipped);
  const flaky = count(stats.flaky);
  const spec = firstSpec(value.suites);
  const topLevelError = Array.isArray(value.errors) ? value.errors.map(asRecord).find(Boolean) : undefined;
  const errorLocation = location(topLevelError?.location) ?? suiteErrorLocation(value.suites);
  return {
    status,
    durationMs: typeof value.durationMs === 'number' && Number.isFinite(value.durationMs) ? value.durationMs : 0,
    stdout: typeof value.stdout === 'string' ? value.stdout : '',
    stderr: typeof value.stderr === 'string' ? value.stderr : '',
    error,
    artifacts,
    report: {
      file: typeof spec?.file === 'string' ? spec.file : '',
      total: passed + failed + skipped + flaky,
      passed,
      failed,
      skipped,
      ...(errorLocation ? { errorLocation } : {})
    }
  };
}

export function canRun(input: { readOnly: boolean; hasErrors: boolean; hasStudio: boolean; status: RunStatus }) {
  return input.hasStudio && !input.readOnly && !input.hasErrors && (input.status === 'idle' || input.status === 'passed' || input.status === 'failed' || input.status === 'stopped');
}

export function runLabel(status: RunStatus) {
  if (status === 'queued') return 'Queued';
  if (status === 'running') return 'Running…';
  if (status === 'passed') return 'Run again';
  if (status === 'failed') return 'Retry';
  if (status === 'stopped') return 'Run again';
  return 'Run test';
}
