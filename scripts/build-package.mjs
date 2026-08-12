#!/usr/bin/env node
// Builds the `@luvikung/three-next` npm package from the library that lives
// (as source) at `src/lib/three-next`, and stages a publish-ready payload at
// `tools/package/release/`. Pure local build — no git or network operations.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = path.join(repoRoot, 'tools', 'package');
const distDir = path.join(packageDir, 'dist');
export const releaseDir = path.join(packageDir, 'release');

const DOC_FILES = ['README.md', 'LICENSE.md', 'CHANGELOG.md'];

export function buildPackage() {
  console.log('[build-package] Building with tsup...');
  // Invoke tsup's CLI entry directly with `node` rather than through the
  // `npx`/`tsup` shims — those are `.cmd` files on Windows, which
  // execFileSync cannot spawn reliably without a shell.
  const tsupCli = path.join(repoRoot, 'node_modules', 'tsup', 'dist', 'cli-default.js');
  execFileSync(process.execPath, [tsupCli, '--config', 'tools/package/tsup.config.ts'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const template = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  const manifest = { ...template, version: rootPkg.version };

  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.cpSync(distDir, path.join(releaseDir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(releaseDir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

  for (const file of DOC_FILES) {
    fs.copyFileSync(path.join(repoRoot, file), path.join(releaseDir, file));
  }

  console.log(`[build-package] Staged @luvikung/three-next v${manifest.version} at ${path.relative(repoRoot, releaseDir)}`);
  return { releaseDir, version: manifest.version };
}

// Allow `node scripts/build-package.mjs` to run this directly, while still
// letting release-package.mjs import buildPackage() without re-running it.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  buildPackage();
}
