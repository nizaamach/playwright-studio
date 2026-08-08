const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { countLocator, startRecorder } = require('./recorder.cjs');
const { deleteStudioTest, discoverTests, renameStudioTest } = require('./project.cjs');
const { runGeneratedTest, stopRunningTest } = require('./runner.cjs');

const studioDir = '.playwright-studio';
let recorderSession = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  win.loadURL(devUrl);
}

async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); }

ipcMain.handle('select-project', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('create-project', async (_event, name, location) => {
  const projectPath = path.join(location, name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase());
  await fs.mkdir(path.join(projectPath, studioDir, 'tests'), { recursive: true });
  await writeJson(path.join(projectPath, studioDir, 'project.json'), { name, testDir: 'tests', createdAt: new Date().toISOString() });
  await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: projectPath.split(path.sep).pop(), private: true, scripts: { test: 'playwright test' }, devDependencies: { '@playwright/test': '^1.50.0' } }, null, 2) + '\n');
  await fs.writeFile(path.join(projectPath, 'playwright.config.ts'), "import { defineConfig } from '@playwright/test';\nexport default defineConfig({ testDir: './tests', use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' } });\n");
  return projectPath;
});

ipcMain.handle('read-project', async (_event, projectPath) => {
  const studioPath = path.join(projectPath, studioDir);
  let project;
  try {
    project = JSON.parse(await fs.readFile(path.join(studioPath, 'project.json'), 'utf8'));
  } catch {
    const packagePath = path.join(projectPath, 'package.json');
    let packageName = path.basename(projectPath);
    try { packageName = JSON.parse(await fs.readFile(packagePath, 'utf8')).name || packageName; } catch {}
    project = { name: packageName, testDir: 'tests', imported: true };
  }
  const discovered = await discoverTests(projectPath);
  const { tests, ...context } = discovered;
  return { project: { ...project, ...context }, tests, projectPath };
});

ipcMain.handle('save-test', async (_event, projectPath, test) => {
  const dir = path.join(projectPath, studioDir, 'tests');
  await fs.mkdir(dir, { recursive: true });
  await writeJson(path.join(dir, `${test.id}.steps.json`), test);
  await fs.writeFile(path.join(dir, `${test.id}.spec.ts`), test.generatedCode);
  return true;
});

ipcMain.handle('rename-test', async (_event, projectPath, testId, name) => {
  const updated = await renameStudioTest(projectPath, testId, name);
  return { ...updated, source: 'studio', readOnly: false };
});

ipcMain.handle('delete-test', async (_event, projectPath, testId) => deleteStudioTest(projectPath, testId));

ipcMain.handle('export-code', async (_event, fileName, code) => {
  const safeName = String(fileName || 'playwright-test').replace(/[^a-z0-9-_]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'playwright-test';
  const result = await dialog.showSaveDialog({
    defaultPath: `${safeName}.spec.ts`,
    filters: [{ name: 'TypeScript', extensions: ['ts'] }]
  });
  if (result.canceled || !result.filePath) return false;
  await fs.writeFile(result.filePath.endsWith('.ts') ? result.filePath : `${result.filePath}.ts`, code);
  return true;
});

ipcMain.handle('run-test', async (_event, request) => runGeneratedTest(request));
ipcMain.handle('stop-test', async () => ({ ok: stopRunningTest() }));
ipcMain.handle('open-artifact', async (_event, artifactPath) => {
  if (typeof artifactPath !== 'string' || !path.isAbsolute(artifactPath)) return false;
  try {
    const stats = await fs.stat(artifactPath);
    if (!stats.isFile()) return false;
    return (await shell.openPath(artifactPath)) === '';
  } catch {
    return false;
  }
});

ipcMain.handle('start-recorder', async (event, url) => {
  if (recorderSession) throw new Error('A recorder session is already active.');
  try {
    recorderSession = await startRecorder(url, (step) => event.sender.send('recorder-event', step), (message) => {
      recorderSession = null;
      event.sender.send('recorder-error', message);
    });
    return { ok: true };
  } catch (error) {
    recorderSession = null;
    event.sender.send('recorder-error', error.message || 'Unable to start recorder.');
    return { ok: false };
  }
});

ipcMain.handle('stop-recorder', async () => {
  if (!recorderSession) return { ok: false };
  const session = recorderSession;
  recorderSession = null;
  await session.close();
  return { ok: true };
});

ipcMain.handle('count-locator', async (_event, locatorType, selector, role) => {
  return countLocator(recorderSession?.page, locatorType, selector, role);
});

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
