#!/usr/bin/env node
// Generate release-manifest.json for a GitHub Release.
// Reads infra/meta/meta.json, git tags, and GitHub Release artifacts.

import { readFile, writeFile } from 'node:fs/promises';
<<<<<<< HEAD
import { execFileSync } from 'node:child_process';

function run(file, args = []) {
  return execFileSync(file, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
}

function getRepoSlug() {
  const remote = run('git', ['remote', 'get-url', 'origin']);
=======
import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
}

function getRepoSlug() {
  const remote = run('git remote get-url origin');
>>>>>>> origin/feature/kfms-gitops-cicd-rollback
  const match = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error('Could not determine GitHub repo slug from origin');
  return { owner: match[1], repo: match[2] };
}

async function main() {
<<<<<<< HEAD
  const tag = process.argv[2] || run('git', ['describe', '--tags', '--exact-match']);
=======
  const tag = process.argv[2] || run('git describe --tags --exact-match');
>>>>>>> origin/feature/kfms-gitops-cicd-rollback
  if (!tag) {
    console.error('Usage: generate-release-manifest.mjs <tag>');
    process.exit(1);
  }

  const meta = JSON.parse(await readFile('infra/meta/meta.json', 'utf8'));
<<<<<<< HEAD
  const sha = run('git', ['rev-list', '-n', '1', tag]);
  let previousTag = '';
  try {
    previousTag = run('git', ['describe', '--tags', '--abbrev=0', 'HEAD^']);
  } catch (e) {
    previousTag = '';
  }
  const commitRange = previousTag ? `${previousTag}..${tag}` : `${sha}`;
  const commits = run('git', ['log', '--oneline', commitRange]).split('\n').filter(Boolean);
=======
  const sha = run(`git rev-list -n 1 ${tag}`);
  const previousTag = run('git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo ""');
  const commitRange = previousTag ? `${previousTag}..${tag}` : `${sha}`;
  const commits = run(`git log --oneline ${commitRange}`).split('\n').filter(Boolean);
>>>>>>> origin/feature/kfms-gitops-cicd-rollback
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${getRepoSlug().owner}/${getRepoSlug().repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

  // Discover artifacts attached to the GitHub Release.
  let artifacts = [];
  try {
<<<<<<< HEAD
    const releaseJson = run('gh', ['release', 'view', tag, '--json', 'assets']);
=======
    const releaseJson = run(`gh release view ${tag} --json assets`);
>>>>>>> origin/feature/kfms-gitops-cicd-rollback
    const release = JSON.parse(releaseJson);
    artifacts = (release.assets || []).map(a => ({
      name: a.name,
      url: a.url,
      size: a.size,
      contentType: a.contentType
    }));
  } catch (e) {
    console.warn('Could not fetch release artifacts via gh CLI. Run this after the release is published.');
  }

  const manifest = {
    schemaVersion: '1.0',
    project: meta.project.name,
    version: meta.version,
    codename: meta.codename.name,
    tag,
    previousTag: previousTag || null,
    commitSha: sha,
    commitRange,
    commits: commits.map(line => {
      const [hash, ...rest] = line.split(' ');
      return { hash, message: rest.join(' ') };
    }),
    builtAtUtc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    workflowRunUrl: runUrl,
    artifacts,
    rolloutStatus: 'published',
    rollbackTo: previousTag || null,
    kfms: {
      version: meta.kfms_version,
      score: meta.studio?.governance?.release_policy?.go_threshold || 85
    }
  };

  const outFile = 'release-manifest.json';
  await writeFile(outFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Generated ${outFile} for ${tag}`);

  // If running in CI, upload to the release.
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_TOKEN) {
    try {
<<<<<<< HEAD
      run('gh', ['release', 'upload', tag, outFile, '--clobber']);
=======
      run(`gh release upload ${tag} ${outFile} --clobber`);
>>>>>>> origin/feature/kfms-gitops-cicd-rollback
      console.log(`Uploaded ${outFile} to GitHub Release ${tag}`);
    } catch (e) {
      console.warn('Failed to upload manifest to release:', e.message);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
