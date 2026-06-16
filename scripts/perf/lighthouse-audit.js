#!/usr/bin/env node
/**
 * NEURODECK Performance Baseline Audit
 *
 * Builds the frontend, serves it statically, runs Lighthouse on a set of
 * representative routes, and writes a Markdown baseline report.
 *
 * Usage:
 *   npm run perf:lighthouse
 *
 * Dependencies (dev):
 *   - lighthouse
 *   - chrome-launcher
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FRONTEND_DIST = path.join(ROOT, 'frontend/dist');
const REPORT_PATH = path.join(ROOT, 'docs/audits/performance-baseline-1.8.x.md');
const BUDGET_PATH = path.join(__dirname, 'lighthouse-budget.json');

// Routes that exercise the major views. Keep in sync with the E2E matrix.
const ROUTES = [
  '/',
  '/chat',
  '/canvas',
  '/terminal',
  '/settings',
  '/memory',
  '/agent',
  '/browser',
  '/ide',
];

const PORT = 4173;

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[perf] ${msg}`);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`"${cmd} ${args.join(' ')}" exited with ${code}`));
      } else {
        resolve();
      }
    });
  });
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      let filePath = path.join(FRONTEND_DIST, url.pathname);
      if (url.pathname === '/') {
        filePath = path.join(FRONTEND_DIST, 'index.html');
      }
      fs.stat(filePath)
        .then((stat) => {
          if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
          }
          return fs.readFile(filePath);
        })
        .then((data) => {
          const ext = path.extname(filePath);
          const mime =
            {
              '.html': 'text/html',
              '.js': 'text/javascript',
              '.css': 'text/css',
              '.json': 'application/json',
              '.png': 'image/png',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
            }[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          res.end(data);
        })
        .catch(() => {
          // SPA fallback
          fs.readFile(path.join(FRONTEND_DIST, 'index.html'))
            .then((data) => {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data);
            })
            .catch((err) => {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(String(err));
            });
        });
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  log('Building frontend...');
  await run('npm', ['run', '--prefix', 'frontend', 'build'], ROOT);

  log('Starting static server...');
  const server = await startStaticServer();

  const budget = JSON.parse(await fs.readFile(BUDGET_PATH, 'utf8'));
  const results = [];

  let chrome;
  try {
    log('Launching Chrome...');
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

    for (const route of ROUTES) {
      log(`Auditing ${route}...`);
      const runnerResult = await lighthouse(`http://localhost:${PORT}${route}`, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        budgets: budget.resourceSizes ? budget : undefined,
      });

      const { audits, categories } = runnerResult.lhr;
      results.push({
        route,
        score: {
          performance: Math.round(categories.performance.score * 100),
          accessibility: Math.round(categories.accessibility.score * 100),
          bestPractices: Math.round(categories['best-practices'].score * 100),
          seo: Math.round(categories.seo.score * 100),
        },
        metrics: {
          fcp: audits['first-contentful-paint']?.numericValue ?? 0,
          lcp: audits['largest-contentful-paint']?.numericValue ?? 0,
          tti: audits['interactive']?.numericValue ?? 0,
          tbt: audits['total-blocking-time']?.numericValue ?? 0,
          cls: audits['cumulative-layout-shift']?.numericValue ?? 0,
          si: audits['speed-index']?.numericValue ?? 0,
        },
        resources: {
          totalBytes: audits['total-byte-weight']?.numericValue ?? 0,
          jsBytes: audits['network-requests']?.details?.items
            ?.filter((i) => i.resourceType === 'Script')
            .reduce((a, b) => a + (b.resourceSize || 0), 0) ?? 0,
          cssBytes: audits['network-requests']?.details?.items
            ?.filter((i) => i.resourceType === 'Stylesheet')
            .reduce((a, b) => a + (b.resourceSize || 0), 0) ?? 0,
        },
        budgets: budget.timings.map((b) => ({
          metric: b.metric,
          budget: b.budget,
          actual: audits[b.metric]?.numericValue ?? 0,
          pass: (audits[b.metric]?.numericValue ?? 0) <= b.budget,
        })),
      });
    }
  } finally {
    if (chrome) await chrome.kill();
    server.close();
  }

  const timestamp = new Date().toISOString();
  const rows = results
    .map(
      (r) =>
        `| ${r.route} | ${r.score.performance} | ${r.score.accessibility} | ${r.score.bestPractices} | ${r.score.seo} | ${r.metrics.fcp.toFixed(0)} | ${r.metrics.lcp.toFixed(0)} | ${r.metrics.tbt.toFixed(0)} | ${r.metrics.cls.toFixed(3)} | ${(r.resources.totalBytes / 1024).toFixed(0)} |`
    )
    .join('\n');

  const budgetRows = results
    .map((r) => {
      const status = r.budgets.every((b) => b.pass) ? '✅' : '⚠️';
      const details = r.budgets
        .map((b) => `${b.metric}: ${b.actual.toFixed(0)}ms (budget ${b.budget}ms) ${b.pass ? '✅' : '❌'}`)
        .join('<br>');
      return `| ${r.route} | ${status} | ${details} |`;
    })
    .join('\n');

  const report = `# NEURODECK Performance Baseline

> Generated: ${timestamp}
> Command: \`npm run perf:lighthouse\`
> Viewport: 1280×800
> Chrome: headless

## Summary

| Route | Performance | Accessibility | Best Practices | SEO | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Total KB |
|---|---|---|---|---|---|---|---|---|---|
${rows}

## Budget Compliance

| Route | Status | Details |
|---|---|---|
${budgetRows}

## Notes

- This baseline uses a static SPA server against the production Vite build.
- The Browser and Terminal views may report lower scores due to heavy third-party/webview initialization; optimize only after confirming with runtime telemetry.
- Re-run this audit after each phase to detect regressions.
`;

  await fs.writeFile(REPORT_PATH, report, 'utf8');
  log(`Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
