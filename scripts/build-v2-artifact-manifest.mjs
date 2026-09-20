import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineCommit = '9d0b9fc30758f537e1aa16869daeb2427b27ea09';
const outputPath = path.join(
  projectRoot,
  'docs',
  'releases',
  'v2-artifact-manifest.json',
);

function describeArtifact(filePath) {
  const content = execFileSync(
    'git',
    ['show', `${baselineCommit}:${filePath}`],
    { cwd: projectRoot, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 },
  );
  return {
    path: filePath,
    bytes: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

const artifactPaths = execFileSync(
  'git',
  [
    'ls-tree',
    '-r',
    '--name-only',
    baselineCommit,
    '--',
    'public/data',
    'src/data/bazi/rules.json',
  ],
  { cwd: projectRoot, encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/)
  .filter((filePath) => filePath.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right));
const artifacts = artifactPaths.map(describeArtifact);
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
