// Checks the words people see in the interface, which live in .ts and .tsx
// files that prosekeep does not scan on its own.
//
// 1. Pulls JSX text and string literals that read as sentences out of the
//    interface and the scripted answers.
// 2. Writes them to .copy/strings.md and runs prosekeep check on that file.
// 3. Flags contrast and negation frames the owner's editorial policy bans.
//
// Model instructions in src/worker/prompts.ts are skipped: they are rules for
// the model, and "never" belongs there.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/web', 'src/shared/desk.ts', 'src/worker/script.ts', 'index.html'];
const SKIP = ['src/worker/prompts.ts'];

const files = [];
const walk = (p) => {
  if (SKIP.includes(p)) return;
  const s = statSync(p);
  if (s.isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f)));
  else if (/\.(tsx?|html)$/.test(p)) files.push(p);
};
ROOTS.forEach(walk);

const strings = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const found = [
    ...src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]{10,})</g),
    ...src.matchAll(/'([A-Z][^'\n]{14,})'/g),
    ...src.matchAll(/"([A-Z][^"\n]{14,})"/g),
    ...src.matchAll(/`([A-Z][^`\n]{14,})`/g),
  ];
  for (const m of found) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text.includes(' ') && !/^[\w.-]+$/.test(text)) strings.push({ file, text });
  }
}

// Frames the owner bans in public copy. Each needs a person to rewrite it.
const BANNED = [
  [/\binstead of\b/i, 'contrast frame: "instead of"'],
  [/\brather than\b/i, 'contrast frame: "rather than"'],
  [/\bnot just\b|\bnot only\b/i, 'contrast frame: "not just / not only"'],
  [/\b(is|are|was|were)n?'?t? not\b.*\bbut\b/i, 'contrast frame: "not X but Y"'],
  [/,\s*not\s+\w+/i, 'contrast frame: "X, not Y"'],
  [/\bonly (when|what|if|the)\b/i, 'restrictive framing: "only when / only what"'],
  [/\b(isn't|aren't|doesn't|don't|won't|can't|never)\b/i, 'negation: say what is true'],
  [/—|–|\s-\s/, 'dash in prose'],
];

const hits = [];
for (const { file, text } of strings) {
  for (const [re, why] of BANNED) if (re.test(text)) hits.push({ file, why, text });
}

mkdirSync('.copy', { recursive: true });
writeFileSync('.copy/strings.md', strings.map((s) => s.text).join('\n\n') + '\n');

let failed = false;
try {
  process.stdout.write(execFileSync('npx', ['--no-install', 'prosekeep', 'check', '.copy/strings.md'], { encoding: 'utf8' }));
} catch (e) {
  process.stdout.write(`${e.stdout ?? ''}${e.stderr ?? ''}`);
  failed = true;
}

console.log(`\n${strings.length} interface strings checked. ${hits.length} banned frames.`);
for (const h of hits) console.log(`${h.file}  ${h.why}\n    ${h.text}`);
if (hits.length) failed = true;

process.exit(failed ? 1 : 0);
