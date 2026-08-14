#!/usr/bin/env node
// Builds the package (see build-package.mjs) and snapshots it onto two git
// branches: `npm/v{version}` (immutable per-release) and `npm/latest`
// (always the newest). Each branch's root *is* the published package, so
// `npm install github:LuviKunG/three-next#npm/latest` works without a
// registry. Never pushes unless invoked with --push — otherwise it prints
// the manual push command so the branch push stays a deliberate step.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPackage, repoRoot } from './build-package.mjs';

const shouldPush = process.argv.includes('--push');
const worktreePath = path.join(repoRoot, '.release-worktree');

function git(args, { cwd = repoRoot, allowFail = false, silent = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: silent ? ['ignore', 'pipe', 'pipe'] : undefined,
    }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function refExists(ref) {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', ref], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function removeWorktreeIfPresent() {
  if (fs.existsSync(worktreePath)) {
    git(['worktree', 'remove', worktreePath, '--force'], { allowFail: true, silent: true });
    fs.rmSync(worktreePath, { recursive: true, force: true });
  }
  git(['worktree', 'prune'], { allowFail: true, silent: true });
}

function prepareBranch(branch, releaseDir, version) {
  removeWorktreeIfPresent();

  const localExists = refExists(`refs/heads/${branch}`);
  git(['fetch', 'origin', branch], { allowFail: true, silent: true });
  const remoteExists = refExists(`refs/remotes/origin/${branch}`);

  if (localExists) {
    git(['worktree', 'add', worktreePath, branch]);
  } else if (remoteExists) {
    git(['worktree', 'add', '-b', branch, worktreePath, `origin/${branch}`]);
  } else {
    git(['worktree', 'add', '--detach', worktreePath]);
    git(['checkout', '--orphan', branch], { cwd: worktreePath });
    git(['rm', '-rf', '--ignore-unmatch', '.'], { cwd: worktreePath, silent: true });
  }

  // Wipe everything the branch currently tracks (previous release's dist/
  // package.json/etc. may differ in shape from this one), then drop in the
  // freshly built payload.
  for (const entry of fs.readdirSync(worktreePath)) {
    if (entry === '.git') continue;
    fs.rmSync(path.join(worktreePath, entry), { recursive: true, force: true });
  }
  fs.cpSync(releaseDir, worktreePath, { recursive: true });

  git(['add', '-A'], { cwd: worktreePath });
  const status = git(['status', '--porcelain'], { cwd: worktreePath });
  const committed = Boolean(status);
  if (committed) {
    git(['commit', '-m', `chore(release): v${version}`], { cwd: worktreePath });
  }
  const headSha = git(['rev-parse', 'HEAD'], { cwd: worktreePath });

  removeWorktreeIfPresent();
  return { branch, committed, headSha };
}

export function releasePackage() {
  const { releaseDir, version } = buildPackage();
  const branches = [`npm/v${version}`, 'npm/latest'];

  const results = branches.map(branch => prepareBranch(branch, releaseDir, version));

  console.log('\n[release-package] Prepared branches:');
  for (const r of results) {
    console.log(
      `  - ${r.branch} @ ${r.headSha.slice(0, 12)}${r.committed ? '' : ' (already up to date, nothing to commit)'}`
    );
  }

  if (shouldPush) {
    console.log('\n[release-package] Pushing to origin...');
    git(['push', 'origin', ...branches]);
    console.log('[release-package] Done.');
  } else {
    console.log('\n[release-package] Not pushing (this was a dry run). To publish these branches:');
    console.log(`  git push origin ${branches.join(' ')}`);
  }

  return { version, branches, results };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  releasePackage();
}
