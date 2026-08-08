export type RunStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export type RunArtifact = { kind: 'screenshot' | 'trace' | 'video'; path: string };
export type RunRequest = { testId: string; source: string; projectPath?: string; testDir?: string; baseURL?: string; environment?: Record<string, string>; headed?: boolean };
export type RunFailure = { title: string; message: string; location?: { file: string; line?: number; column?: number } };
export type RunReport = {
  file: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errorLocation?: { file: string; line?: number; column?: number };
  failures?: RunFailure[];
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
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function total(...counts: number[]) {
  const value = counts.reduce((sum, count) => sum + count, 0);
  return Number.isSafeInteger(value) ? value : undefined;
}

function location(value: unknown): RunReport['errorLocation'] {
  const candidate = asRecord(value);
  if (!candidate || typeof candidate.file !== 'string' || !candidate.file) return undefined;
  const line = typeof candidate.line === 'number' && Number.isSafeInteger(candidate.line) && candidate.line > 0 ? candidate.line : undefined;
  const column = typeof candidate.column === 'number' && Number.isSafeInteger(candidate.column) && candidate.column > 0 ? candidate.column : undefined;
  return { file: candidate.file, ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) };
}

function errorMessage(value: unknown): string {
  const candidate = asRecord(value);
  return typeof value === 'string' ? value : typeof candidate?.message === 'string' ? candidate.message : '';
}

function failureDetail(value: unknown): Pick<RunFailure, 'message' | 'location'> | undefined {
  const candidate = asRecord(value);
  if (!candidate) return undefined;
  const errorLocation = location(candidate.location);
  const nested = failureDetail(candidate.error);
  if (nested) {
    const nestedLocation = nested.location ?? errorLocation;
    return { ...nested, ...(nestedLocation ? { location: nestedLocation } : {}) };
  }
  if (typeof candidate.message !== 'string' || !candidate.message.trim()) return undefined;
  return { message: candidate.message, ...(errorLocation ? { location: errorLocation } : {}) };
}

function failureTitle(spec: Record<string, unknown>, test: Record<string, unknown>, file: string): string {
  const specTitle = typeof spec.title === 'string' && spec.title ? spec.title : '';
  const testTitle = typeof test.title === 'string' && test.title ? test.title : '';
  if (specTitle && testTitle) return `${specTitle} > ${testTitle}`;
  if (testTitle || specTitle) return testTitle || specTitle;
  if (file) return file;
  return 'Unknown step';
}

function stepFailures(steps: unknown, fallbackTitle: string): RunFailure[] {
  if (!Array.isArray(steps)) return [];
  const failures: RunFailure[] = [];
  for (const value of steps) {
    const step = asRecord(value);
    if (!step) continue;
    const nested = stepFailures(step.steps, fallbackTitle);
    if (nested.length) {
      failures.push(...nested);
      continue;
    }
    const detail = failureDetail(step.error);
    if (!detail) continue;
    const title = typeof step.title === 'string' && step.title.trim() ? step.title : fallbackTitle;
    failures.push({ title, ...detail });
  }
  return failures;
}

function specFailures(spec: Record<string, unknown>): RunFailure[] {
  const file = typeof spec.file === 'string' ? spec.file : '';
  if (!Array.isArray(spec.tests)) return [];
  const failures: RunFailure[] = [];
  for (const value of spec.tests) {
    const test = asRecord(value);
    if (!test || !Array.isArray(test.results)) continue;
    for (const resultValue of test.results) {
      const result = asRecord(resultValue);
      if (!result) continue;
      const title = failureTitle(spec, test, file);
      const steps = stepFailures(result.steps, title);
      if (steps.length) {
        failures.push(...steps);
        continue;
      }
      if (!Array.isArray(result.errors)) continue;
      for (const errorValue of result.errors) {
        const detail = failureDetail(errorValue);
        if (detail) failures.push({ title, ...detail });
      }
    }
  }
  return failures;
}

function suiteFailures(suites: unknown): RunFailure[] {
  const failures: RunFailure[] = [];
  function visit(values: unknown[]) {
    for (const value of values) {
      const suite = asRecord(value);
      if (!suite) continue;
      if (Array.isArray(suite.specs)) {
        for (const specValue of suite.specs) {
          const spec = asRecord(specValue);
          if (spec) failures.push(...specFailures(spec));
        }
      }
      if (Array.isArray(suite.suites)) visit(suite.suites);
    }
  }
  if (Array.isArray(suites)) visit(suites);
  return failures;
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

function resultError(spec: Record<string, unknown> | undefined) {
  if (!spec || !Array.isArray(spec.tests)) return '';
  for (const test of spec.tests) {
    const testRecord = asRecord(test);
    if (!testRecord || !Array.isArray(testRecord.results)) continue;
    for (const result of testRecord.results) {
      const errors = asRecord(result)?.errors;
      if (!Array.isArray(errors)) continue;
      for (const error of errors) {
        const message = errorMessage(error);
        if (message) return message;
      }
    }
  }
  return '';
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

function suiteError(suites: unknown) {
  const pending = Array.isArray(suites) ? [...suites] : [];
  while (pending.length) {
    const suite = asRecord(pending.shift());
    if (!suite) continue;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const message = resultError(asRecord(spec));
        if (message) return message;
      }
    }
    if (Array.isArray(suite.suites)) pending.push(...suite.suites);
  }
  return '';
}

export function normalizeRunResult(payload: unknown): RunResult {
  const value = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const status: RunResult['status'] = value.status === 'passed' || value.status === 'stopped' ? value.status : 'failed';
  const topLevelError = Array.isArray(value.errors) ? value.errors.map(asRecord).find(Boolean) : undefined;
  const error = errorMessage(value.error) || errorMessage(topLevelError) || suiteError(value.suites);
  const artifacts = Array.isArray(value.artifacts)
    ? value.artifacts.filter((item): item is RunArtifact => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.path === 'string' && artifactKinds.has(candidate.kind as RunArtifact['kind']);
    })
    : [];
  const stats = asRecord(value.stats) ?? {};
  const expected = count(stats.expected);
  const unexpected = count(stats.unexpected);
  const skippedCount = count(stats.skipped);
  const flaky = count(stats.flaky);
  const reportTotal = total(expected, unexpected, skippedCount, flaky);
  const passed = reportTotal === undefined ? 0 : expected + flaky;
  const failed = reportTotal === undefined ? 0 : unexpected;
  const skipped = reportTotal === undefined ? 0 : skippedCount;
  const spec = firstSpec(value.suites);
  const errorLocation = status === 'failed' ? location(topLevelError?.location) ?? suiteErrorLocation(value.suites) : undefined;
  const failures = status === 'failed' ? suiteFailures(value.suites) : undefined;
  return {
    status,
    durationMs: typeof value.durationMs === 'number' && Number.isFinite(value.durationMs) ? value.durationMs : 0,
    stdout: typeof value.stdout === 'string' ? value.stdout : '',
    stderr: typeof value.stderr === 'string' ? value.stderr : '',
    error,
    artifacts,
    report: {
      file: typeof spec?.file === 'string' ? spec.file : '',
      total: reportTotal ?? 0,
      passed,
      failed,
      skipped,
      ...(errorLocation ? { errorLocation } : {}),
      ...(failures?.length ? { failures } : {})
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
