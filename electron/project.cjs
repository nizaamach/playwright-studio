const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');

const studioDir = '.playwright-studio';
const testIdPattern = /^[a-zA-Z0-9_-]+$/;

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

async function readConfig(projectPath) {
  try {
    return await fs.readFile(path.join(projectPath, 'playwright.config.ts'), 'utf8');
  } catch {
    return '';
  }
}

function readDelimitedBlock(source, start, open, close) {
  const openIndex = source.indexOf(open, start);
  if (openIndex < 0) return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (!quote && character === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (!quote && character === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') { quote = character; continue; }
    if (character === open) depth += 1;
    if (character === close) {
      depth -= 1;
      if (!depth) return source.slice(openIndex + 1, index);
    }
  }
  return '';
}

function staticString(source, property) {
  const match = source.match(new RegExp('\\b' + property + '\\s*:\\s*([\'\"`])([\\s\\S]*?)\\1'));
  return match?.[2];
}

function propertyBlock(source, property, open, close) {
  const propertyIndex = source.search(new RegExp(`\\b${property}\\s*:`));
  if (propertyIndex < 0) return '';
  return readDelimitedBlock(source, propertyIndex, open, close);
}

function staticProjectNames(source) {
  const projectsBlock = propertyBlock(source, 'projects', '[', ']');
  if (!projectsBlock) return undefined;
  const names = [...projectsBlock.matchAll(/\bname\s*:\s*(['"])(.*?)\1/g)].map((match) => match[2].trim()).filter(Boolean);
  return names.length ? [...new Set(names)] : undefined;
}

async function discoverProjectContext(projectPath) {
  const config = await readConfig(projectPath);
  const useBlock = propertyBlock(config, 'use', '{', '}');
  const baseURL = staticString(useBlock, 'baseURL') || staticString(useBlock, 'baseUrl');
  return {
    testDir: staticString(config, 'testDir') || 'tests',
    ...(baseURL ? { baseURL } : {}),
    ...(staticProjectNames(config) ? { projects: staticProjectNames(config) } : {})
  };
}

async function readTestDir(projectPath) {
  return (await discoverProjectContext(projectPath)).testDir;
}

function existingId(relativePath) {
  return `existing-${crypto.createHash('sha1').update(relativePath).digest('hex').slice(0, 12)}`;
}

async function discoverTests(projectPath) {
  const studioPath = path.join(projectPath, studioDir, 'tests');
  const studioFiles = await fs.readdir(studioPath).catch(() => []);
  const tests = [];
  for (const file of studioFiles.filter((item) => item.endsWith('.steps.json'))) {
    const metadataPath = path.join(studioPath, file);
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    tests.push({ ...metadata, source: 'studio', readOnly: false, relativePath: path.join(studioDir, 'tests', file) });
  }

  const context = await discoverProjectContext(projectPath);
  const testDir = context.testDir;
  const existingRoot = path.resolve(projectPath, testDir);
  for (const file of (await walk(existingRoot)).filter((item) => item.endsWith('.spec.ts'))) {
    const relativePath = path.relative(projectPath, file);
    tests.push({
      id: existingId(relativePath),
      name: path.basename(file, '.spec.ts'),
      steps: [],
      generatedCode: await fs.readFile(file, 'utf8'),
      source: 'existing',
      readOnly: true,
      relativePath
    });
  }
  return { ...context, tests };
}

function assertStudioId(testId) {
  if (!testIdPattern.test(testId)) throw new Error('Invalid Studio test id.');
}

async function renameStudioTest(projectPath, testId, name) {
  assertStudioId(testId);
  const dir = path.join(projectPath, studioDir, 'tests');
  const metadataPath = path.join(dir, `${testId}.steps.json`);
  const codePath = path.join(dir, `${testId}.spec.ts`);
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const nextName = String(name || '').trim();
  if (!nextName) throw new Error('Test name is required.');
  metadata.name = nextName;
  metadata.generatedCode = metadata.generatedCode.replace(/test\(\s*(['"`])[\s\S]*?\1\s*,/, `test(${JSON.stringify(nextName)},`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
  await fs.writeFile(codePath, metadata.generatedCode);
  return metadata;
}

async function deleteStudioTest(projectPath, testId) {
  assertStudioId(testId);
  const dir = path.join(projectPath, studioDir, 'tests');
  await fs.rm(path.join(dir, `${testId}.steps.json`));
  await fs.rm(path.join(dir, `${testId}.spec.ts`), { force: true });
  return true;
}

module.exports = { deleteStudioTest, discoverProjectContext, discoverTests, renameStudioTest, readTestDir };
