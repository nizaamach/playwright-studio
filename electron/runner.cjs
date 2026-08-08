const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

let activeProcess = null;

function buildRunCommand(cwd, specFile, playwrightBin) {
  if (playwrightBin) return { command: playwrightBin, args: ['test', specFile, '--reporter=json'], cwd };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['playwright', 'test', specFile, '--reporter=json'], cwd };
}

function parseRunnerOutput(stdout, exitCode = 0) {
  try {
    const parsed = JSON.parse(stdout);
    return { ...parsed, status: parsed.status === 'passed' && exitCode === 0 ? 'passed' : 'failed' };
  } catch {
    return { status: exitCode === 0 ? 'passed' : 'failed', stdout };
  }
}

async function listArtifacts(directory) {
  const artifacts = [];
  async function visit(current) {
    let entries;
    try { entries = await fs.readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith('.zip')) artifacts.push({ kind: 'trace', path: file });
      else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) artifacts.push({ kind: 'screenshot', path: file });
      else if (/\.webm$/i.test(entry.name)) artifacts.push({ kind: 'video', path: file });
    }
  }
  await visit(directory);
  return artifacts;
}

async function runGeneratedTest(request) {
  if (!request || typeof request.source !== 'string' || !request.source.trim()) throw new Error('Test source is required.');
  const projectPath = path.resolve(String(request.projectPath || process.cwd()));
  const testDir = typeof request.testDir === 'string' && request.testDir.trim() ? request.testDir : 'tests';
  const runBase = path.resolve(projectPath, testDir, 'playwright-studio-runs');
  if (!runBase.startsWith(`${projectPath}${path.sep}`)) throw new Error('Invalid test directory.');
  await fs.mkdir(runBase, { recursive: true });
  const runRoot = await fs.mkdtemp(path.join(runBase, 'run-'));
  const specFile = `${String(request.testId || 'test').replace(/[^a-z0-9-_]/gi, '-') || 'test'}.spec.ts`;
  const specPath = path.join(runRoot, specFile);
  await fs.writeFile(specPath, request.source, 'utf8');
  const localBin = path.resolve(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
  const command = buildRunCommand(projectPath, path.relative(projectPath, specPath), existsSync(localBin) ? localBin : undefined);
  const startedAt = Date.now();
  const studioNodeModules = path.resolve(__dirname, '..', 'node_modules');
  const env = { ...process.env, NODE_PATH: [studioNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter), ...(request.environment || {}) };
  if (request.baseURL) env.PLAYWRIGHT_STUDIO_BASE_URL = request.baseURL;
  const child = spawn(command.command, command.args, { cwd: command.cwd, env, windowsHide: true });
  activeProcess = child;
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  activeProcess = null;
  const parsed = parseRunnerOutput(stdout, exitCode);
  return {
    ...parsed,
    status: exitCode === 0 ? 'passed' : 'failed',
    durationMs: Date.now() - startedAt,
    stdout,
    stderr,
    error: exitCode === 0 ? '' : (stderr.trim() || parsed.error || 'Playwright test failed.'),
    artifacts: await listArtifacts(runRoot)
  };
}

function stopRunningTest() {
  if (!activeProcess) return false;
  activeProcess.kill('SIGTERM');
  activeProcess = null;
  return true;
}

module.exports = { buildRunCommand, parseRunnerOutput, runGeneratedTest, stopRunningTest };
