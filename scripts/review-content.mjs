// Offline editorial review by default. Explicit capture uses a local dev server.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const spec = JSON.parse(readFileSync('content-baseline/cases.json', 'utf8'));
const ids = new Set(spec.cases.map(c => c.id));
if (ids.size !== 20 || spec.cases.length !== 20) throw Error('Expected 20 distinct baseline cases.');
const args = process.argv.slice(2);
if (args[0] === '--capture') {
  if (args.length !== 3) throw Error('Usage: node scripts/review-content.mjs --capture LOCAL_URL OUTPUT.json');
  const base = new URL(args[1]);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw Error('Capture requires a plain HTTP loopback origin without credentials.');
  }
  const request = async (path, body) => {
    const response = await fetch(new URL(path, base), {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
      redirect: 'error',
    });
    if (!response.ok) throw Error(`${path} returned ${response.status}`);
    return response.json();
  };
  const health = await request('/api/health');
  const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const output = {
    captured_at: new Date().toISOString(),
    runtime: health.model === 'scripted' ? 'scripted' : 'live-or-unavailable',
    health,
    git_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    source_sha256: Object.fromEntries(['src/worker/prompts.ts', 'src/worker/model.ts', 'src/worker/script.ts', 'content-baseline/cases.json'].map(f => [f, hash(f)])),
    model_identity: 'Record the actual served model and revision separately for live comparisons.',
    cases: [],
  };
  const target = resolve(args[2]);
  mkdirSync(dirname(target), { recursive: true });
  for (const c of spec.cases) {
    const row = { id: c.id, kind: c.kind };
    try {
      if (c.kind === 'manager') {
        row.request = c.request;
        row.response = await request('/api/manager', row.request);
      } else {
        row.sort_request = { text: c.input, earlierTurns: 0 };
        row.sort_response = await request('/api/sort', row.sort_request);
        row.request = {
          text: c.input,
          sort: row.sort_response.sort,
          parts: { ...c.parts, slips: row.sort_response.sort.sort === 'desk' ? 0 : 1 },
          earlierTurns: 0,
        };
        row.response = await request('/api/answer', row.request);
      }
    } catch (error) {
      row.error = error.message;
      process.exitCode = 1;
    }
    output.cases.push(row);
    writeFileSync(target, JSON.stringify(output, null, 2) + '\n');
  }
  console.log(`Captured ${output.cases.length} cases (${output.runtime}) to ${args[2]}. Semantic review pending.`);
} else {
  if (args.length !== 1) throw Error('Usage: node scripts/review-content.mjs OBSERVATION.json');
  const run = JSON.parse(readFileSync(args[0], 'utf8'));
  const seen = new Set();
  const findings = [];
  const prose = [];
  const add = (id, field, text) => {
    if (typeof text !== 'string') throw Error(`${field} must be a string`);
    if (text.trim()) prose.push(`## ${id}: ${field}\n\n${text}`);
  };
  for (const row of run.cases) {
    try {
      if (!ids.has(row.id) || seen.has(row.id)) throw Error('Unknown or duplicate case');
      seen.add(row.id);
      if (row.error) throw Error(row.error);
      const c = spec.cases.find(c => c.id === row.id);
      if (row.kind !== c.kind) throw Error('Unexpected response kind');
      if (row.kind === 'manager') {
        const checks = row.response.checks;
        for (const key of ['covered', 'sourcesAgree', 'desksExist', 'sectionsPresent']) {
          if (typeof checks[key] !== 'boolean') throw Error(`Missing boolean ${key}`);
        }
        add(row.id, 'note', checks.note);
        continue;
      }
      const a = row.response.answer;
      const sort = row.sort_response.sort;
      if (!['desk', 'route', 'both'].includes(sort.sort)) throw Error('Invalid sort');
      for (const key of ['category', 'place']) add(row.id, key, sort[key]);
      sort.path.forEach((text, i) => add(row.id, `path ${i + 1}`, text));
      for (const key of ['short', 'ask_someone']) add(row.id, key, a[key]);
      a.known.forEach((k, i) => {
        add(row.id, `known ${i + 1}`, k.text);
        if (!Number.isInteger(k.source) || k.source < 0 || k.source > a.sources.length) {
          findings.push(`${row.id}: known ${i + 1} has an invalid source reference`);
        }
      });
      a.changes_if.forEach((text, i) => add(row.id, `changes_if ${i + 1}`, text));
      a.desks.forEach((desk, i) => {
        for (const key of ['name', 'what', 'ask', 'cost', 'bring']) add(row.id, `desk ${i + 1} ${key}`, desk[key]);
      });
      if (a.question_back !== null) {
        add(row.id, 'question', a.question_back.text);
        a.question_back.choices.forEach((choice, i) => {
          add(row.id, `choice ${i + 1}`, choice.label);
          add(row.id, `next ${i + 1}`, choice.next);
        });
      }
      a.sources.forEach((source, i) => {
        add(row.id, `source ${i + 1} title`, source.title);
        add(row.id, `source ${i + 1} site`, source.site);
      });
      if (row.request.parts.words === 0 && (a.short || a.known.length)) findings.push(`${row.id}: answer text returned for route-only request`);
    } catch (error) {
      findings.push(`${row.id}: ${error.message}`);
    }
  }
  for (const id of ids) if (!seen.has(id)) findings.push(`${id}: missing case`);
  mkdirSync('.copy', { recursive: true });
  writeFileSync('.copy/content-review.md', '# Captured response text\n\n' + prose.join('\n\n') + '\n');
  const result = spawnSync(resolve('node_modules/.bin/prosekeep'), ['check', '.copy/content-review.md'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  for (const finding of findings) console.error(finding);
  console.log(`${seen.size}/${ids.size} cases present; ${findings.length} response integrity findings. Semantic review and owner approval remain pending.`);
  process.exitCode = result.status === 0 && findings.length === 0 ? 0 : 1;
}
