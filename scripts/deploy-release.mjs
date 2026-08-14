#!/usr/bin/env node
// Interactive release flow. Always asks which version you're releasing, then:
//   1. bumps "version" in package.json
//   2. commits (along with anything else already pending) on `develop`
//   3. pushes `develop`
//   4. fast-forwards `main` to match and pushes it
//   5. tags v{version} and pushes the tag
// Pushing the tag is what triggers `.github/workflows/publish-package.yml`,
// which builds the package and publishes it to npm — this script itself
// never touches npm directly.
//
// Run with: node scripts/deploy-release.mjs   (or `npm run release`)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(repoRoot, 'package.json');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');

const DEVELOP_BRANCH = 'develop';
const MAIN_BRANCH = 'main';
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function git(args, { allowFail = false, silent = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: silent ? ['ignore', 'pipe', 'pipe'] : undefined,
    }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function tagExists(tag) {
  return (
    git(['show-ref', '--verify', '--quiet', `refs/tags/${tag}`], {
      allowFail: true,
      silent: true,
    }) !== null
  );
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function readPkgVersion() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
}

function writePkgVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function changelogMentionsVersion(version) {
  if (!fs.existsSync(changelogPath)) return false;
  return fs.readFileSync(changelogPath, 'utf8').includes(`Version ${version}`);
}

async function confirm(rl, question) {
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

async function promptVersion(rl) {
  const current = readPkgVersion();
  console.log(`[deploy-release] Current package.json version: ${current}`);

  for (;;) {
    const version = (await rl.question('Version to release (e.g. 1.3.2, no leading "v"): ')).trim();

    if (!VERSION_RE.test(version)) {
      console.log('  Please enter a plain semver version, like 1.3.2.');
      continue;
    }
    if (tagExists(`v${version}`)) {
      console.log(`  Tag v${version} already exists locally. Pick a different version.`);
      continue;
    }
    if (compareVersions(version, current) <= 0) {
      const proceed = await confirm(
        rl,
        `  ${version} is not greater than the current version (${current}). Use it anyway?`
      );
      if (!proceed) continue;
    }
    if (!changelogMentionsVersion(version)) {
      console.log(
        `  Note: CHANGELOG.md has no "Version ${version}" entry yet. You can add one after this script commits, in a follow-up commit.`
      );
      const proceed = await confirm(rl, '  Continue without a changelog entry?');
      if (!proceed) continue;
    }
    return version;
  }
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (currentBranch !== DEVELOP_BRANCH) {
      console.error(
        `[deploy-release] Expected to be on '${DEVELOP_BRANCH}', but currently on '${currentBranch}'. Switch branches and try again.`
      );
      process.exitCode = 1;
      return;
    }

    git(['fetch', 'origin', DEVELOP_BRANCH, MAIN_BRANCH], { allowFail: true, silent: true });
    const behind = git(['rev-list', '--count', `${DEVELOP_BRANCH}..origin/${DEVELOP_BRANCH}`], {
      allowFail: true,
    });
    if (behind && behind !== '0') {
      console.error(
        `[deploy-release] '${DEVELOP_BRANCH}' is behind 'origin/${DEVELOP_BRANCH}' by ${behind} commit(s). Pull first.`
      );
      process.exitCode = 1;
      return;
    }

    const version = await promptVersion(rl);
    const tag = `v${version}`;
    const hadPendingChanges = Boolean(git(['status', '--porcelain']));

    console.log(`\n[deploy-release] Preparing release ${tag}:`);
    console.log(`  - Bump package.json version to ${version}`);
    console.log(
      `  - Commit${hadPendingChanges ? ' (with your other pending changes)' : ''} on '${DEVELOP_BRANCH}'`
    );
    console.log(`  - Push '${DEVELOP_BRANCH}'`);
    console.log(`  - Fast-forward '${MAIN_BRANCH}' to match and push it`);
    console.log(`  - Tag ${tag} and push it (triggers the npm publish workflow)\n`);

    if (!(await confirm(rl, 'Proceed?'))) {
      console.log('[deploy-release] Aborted — nothing was changed.');
      return;
    }

    writePkgVersion(version);
    git(['add', '-A']);
    if (git(['status', '--porcelain'])) {
      git(['commit', '-m', `chore(release): ${tag}`]);
    } else {
      console.log(
        '[deploy-release] Nothing to commit (already at this version, no other pending changes).'
      );
    }

    console.log(`[deploy-release] Pushing '${DEVELOP_BRANCH}'...`);
    git(['push', 'origin', DEVELOP_BRANCH]);

    console.log(`[deploy-release] Fast-forwarding '${MAIN_BRANCH}'...`);
    git(['checkout', MAIN_BRANCH]);
    try {
      git(['merge', '--ff-only', DEVELOP_BRANCH]);
    } catch (err) {
      git(['checkout', DEVELOP_BRANCH]);
      throw new Error(
        `Could not fast-forward '${MAIN_BRANCH}' from '${DEVELOP_BRANCH}' — they've diverged. Resolve manually, then re-run.\n${err.message}`
      );
    }
    git(['push', 'origin', MAIN_BRANCH]);
    git(['checkout', DEVELOP_BRANCH]);

    console.log(`[deploy-release] Tagging ${tag}...`);
    git(['tag', '-a', tag, '-m', `chore(release): ${tag}`]);
    git(['push', 'origin', tag]);

    console.log(
      `\n[deploy-release] Done. Pushed ${tag} — check the "Publish package" workflow on GitHub Actions for build/publish status.`
    );
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error(`\n[deploy-release] Failed: ${err.message}`);
  process.exitCode = 1;
});
