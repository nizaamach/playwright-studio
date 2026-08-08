export type RunStatus = 'idle' | 'queued' | 'running' | 'passed' | 'failed' | 'stopped';
export type RunArtifact = { kind: 'screenshot' | 'trace' | 'video'; path: string };
export type RunRequest = { testId: string; source: string; projectPath?: string; testDir?: string; baseURL?: string; environment?: Record<string, string>; headed?: boolean };
export type RunResult = {
  status: Exclude<RunStatus, 'idle' | 'queued' | 'running'>;
  durationMs: number;
  stdout: string;
  stderr: string;
  error: string;
  artifacts: RunArtifact[];
};

const artifactKinds = new Set<RunArtifact['kind']>(['screenshot', 'trace', 'video']);

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
  return {
    status,
    durationMs: typeof value.durationMs === 'number' && Number.isFinite(value.durationMs) ? value.durationMs : 0,
    stdout: typeof value.stdout === 'string' ? value.stdout : '',
    stderr: typeof value.stderr === 'string' ? value.stderr : '',
    error,
    artifacts
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
