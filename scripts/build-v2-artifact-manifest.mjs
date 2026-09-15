import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDataRoot = path.join(projectRoot, 'public', 'data');
const outputPath = path.join(
  projectRoot,
  'docs',
  'releases',
  'v2-artifact-manifest.json',
);

async function collectJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectJsonFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

async function describeArtifact(filePath) {
  const content = await readFile(filePath);
  return {
    path: toProjectPath(filePath),
    bytes: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

const publicJsonFiles = await collectJsonFiles(publicDataRoot);
const artifactPaths = [
  ...publicJsonFiles,
  path.join(projectRoot, 'src', 'data', 'bazi', 'rules.json'),
].sort((left, right) => toProjectPath(left).localeCompare(toProjectPath(right)));
const artifacts = await Promise.all(artifactPaths.map(describeArtifact));
const manifest = `${JSON.stringify(
  {
    schemaVersion: 1,
    baseline: 'Name V2',
    artifactCount: artifacts.length,
    artifacts,
  },
  null,
  2,
)}\n`;

if (process.argv.includes('--check')) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '');
  if (existing !== manifest) {
    console.error('V2 artifact manifest is missing or out of date.');
    process.exitCode = 1;
  } else {
    console.log(`V2 artifact manifest verified: ${artifacts.length} artifacts.`);
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, manifest, 'utf8');
  console.log(`V2 artifact manifest written: ${artifacts.length} artifacts.`);
}
