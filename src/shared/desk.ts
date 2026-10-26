// The desk's rules: what a call costs, what the options are, what a refund
// covers, and how a manager decides. All of it is arithmetic on the posted
// schedule, so it lives here, runs in the browser and the Worker alike, and
// has tests. Nothing here talks to a model.

export const SCHEDULE = {
  sort: 40,
  slip: 60,
  source: 120,
  word: 1,
  check: 80,
  /** Each earlier turn in the thread adds this share of the total. */
  turnShare: 0.1,
} as const;

/** The house rate: 1,000 tkn to $0.25. Notional, never a real charge. */
export const RATE_USD_PER_1000 = 0.25;
/** Weekly allowance, refilled on Monday. */
export const ALLOWANCE = 5000;
/** Counter refund limits. */
export const COUNTER_MAX = 300;
export const COUNTER_WEEK_MAX = 1000;
/** Footprint per token. */
export const FOOTPRINT = { whPerToken: 0.0002, mlPerToken: 0.15, gPerKwh: 380 } as const;

export type Sort = 'desk' | 'route' | 'both';
export type OptionKey = 'route' | 'quick' | 'sources' | 'lookinto';

export interface Option {
  key: OptionKey;
  label: string;
  does: string;
  slips: number;
  sources: number;
  words: number;
  check: boolean;
}

/** What each option buys. Words are the estimate before the answer runs. */
export function options(sort: Sort): Option[] {
  const slips = sort === 'desk' ? 0 : 1;
  const all: Option[] = [
    { key: 'route', label: 'Route only', does: 'sort and a slip', slips: 1, sources: 0, words: 0, check: false },
    { key: 'quick', label: 'Quick answer', does: 'sort and a short answer', slips, sources: 0, words: 100, check: false },
    { key: 'sources', label: 'Answer with sources', does: 'sort, sources, answer', slips, sources: 2, words: 180, check: false },
    { key: 'lookinto', label: 'Look into it', does: 'sort, more sources, answer, check', slips, sources: 3, words: 300, check: true },
  ];
  return sort === 'desk' ? all.filter((o) => o.key !== 'route') : all;
}

export interface PriceLine {
  label: string;
  tkn: number;
}

export interface Price {
  total: number;
  lines: PriceLine[];
  /** The formula on one line, as the desk posts it. */
  formula: string;
}

export function price(parts: { slips: number; sources: number; words: number; check: boolean }, earlierTurns = 0): Price {
  const lines: PriceLine[] = [{ label: 'Sort', tkn: SCHEDULE.sort }];
  if (parts.slips) lines.push({ label: parts.slips === 1 ? 'slip' : `${parts.slips} slips`, tkn: parts.slips * SCHEDULE.slip });
  if (parts.sources) lines.push({ label: parts.sources === 1 ? '1 source' : `${parts.sources} sources`, tkn: parts.sources * SCHEDULE.source });
  if (parts.words) lines.push({ label: `about ${parts.words} words`, tkn: parts.words * SCHEDULE.word });
  if (parts.check) lines.push({ label: 'check', tkn: SCHEDULE.check });
  let total = lines.reduce((n, l) => n + l.tkn, 0);
  if (earlierTurns > 0) {
    const extra = Math.round(total * SCHEDULE.turnShare * earlierTurns);
    lines.push({ label: `${earlierTurns} earlier ${earlierTurns === 1 ? 'turn' : 'turns'}`, tkn: extra });
    total += extra;
  }
  return { total, lines, formula: lines.map((l) => `${l.label} ${l.tkn}`).join(' · ') };
}

export const usd = (tkn: number) => (tkn / 1000) * RATE_USD_PER_1000;

export function footprint(tkn: number) {
  const wh = tkn * FOOTPRINT.whPerToken;
  return { wh, ml: tkn * FOOTPRINT.mlPerToken, g: (wh / 1000) * FOOTPRINT.gPerKwh };
}

// Refunds at the counter. Each reason maps to the line items it covers.

export type CounterReason = 'source' | 'desk' | 'price' | 'asked' | 'other';

export const COUNTER_REASONS: { key: CounterReason; label: string }[] = [
  { key: 'source', label: 'The answer contradicted its own source' },
  { key: 'desk', label: 'It sent me to the wrong desk' },
  { key: 'price', label: 'I was charged more than the posted price' },
  { key: 'asked', label: 'It did not answer what I asked' },
  { key: 'other', label: 'Something else' },
];

export interface CounterResult {
  /** Tokens back on the spot. 0 when the claim goes to the manager. */
  amount: number;
  lines: PriceLine[];
  toManager: boolean;
  why: string;
}

export function counterRefund(reason: CounterReason, charged: Price, overcharge: number, weekSoFar: number): CounterResult {
  const find = (label: RegExp) => charged.lines.filter((l) => label.test(l.label));
  const sum = (ls: PriceLine[]) => ls.reduce((n, l) => n + l.tkn, 0);
  const decide = (lines: PriceLine[], why: string): CounterResult => {
    const amount = sum(lines);
    if (amount > COUNTER_MAX || weekSoFar + amount > COUNTER_WEEK_MAX) {
      return { amount: 0, lines, toManager: true, why: `A refund of ${amount} tkn is over the counter limit. A manager can review it.` };
    }
    return { amount, lines, toManager: false, why };
  };
  switch (reason) {
    case 'source':
      return decide([...find(/^check$/), ...find(/words/)], 'The check and the answer words are refunded.');
    case 'desk':
      return decide(find(/slip/), 'The slip is refunded. The next routing on this call is free.');
    case 'price':
      return { amount: overcharge, lines: overcharge ? [{ label: 'over the posted price', tkn: overcharge }] : [], toManager: false, why: overcharge ? 'The difference is refunded.' : 'The charge matched the posted price.' };
    case 'asked': {
      const all = charged.lines;
      const amount = sum(all);
      if (amount <= COUNTER_MAX && weekSoFar + amount <= COUNTER_WEEK_MAX) return { amount, lines: all, toManager: false, why: 'The whole charge is refunded.' };
      return { amount: 0, lines: all, toManager: true, why: `A full refund is ${amount} tkn, over the counter limit. A manager can review it.` };
    }
    default:
      return { amount: 0, lines: [], toManager: true, why: 'A manager reviews this claim and can give a free redo.' };
  }
}

// The manager. Three answers from the person, five checks, one decision.

export type Claim = 'facts' | 'desk' | 'asked' | 'price' | 'other';
export type CostToYou = 'time' | 'trip' | 'money' | 'tokens';
export type Want = 'tokens' | 'redo' | 'both';

export const MANAGER_QUESTIONS = [
  { key: 'claim', q: 'What went wrong?', choices: [['facts', 'The facts were wrong'], ['desk', 'It sent me to the wrong desk'], ['asked', 'It did not answer what I asked'], ['price', 'I was overcharged'], ['other', 'Something else']] },
  { key: 'cost', q: 'What did it cost you?', choices: [['time', 'Time'], ['trip', 'A wasted trip'], ['money', 'Money'], ['tokens', 'The tokens']] },
  { key: 'want', q: 'What would make it right?', choices: [['tokens', 'Tokens back'], ['redo', 'A free redo'], ['both', 'Both']] },
] as const;

export interface Checks {
  covered: boolean;
  sourcesAgree: boolean;
  desksExist: boolean;
  priceMatched: boolean;
  sectionsPresent: boolean;
}

export const CHECK_LABELS: { key: keyof Checks; label: string }[] = [
  { key: 'covered', label: 'The answer covered the question asked' },
  { key: 'sourcesAgree', label: 'The cited sources say what the answer claimed' },
  { key: 'desksExist', label: 'Each named desk exists and handles this kind of call' },
  { key: 'priceMatched', label: 'The charge matched the posted price' },
  { key: 'sectionsPresent', label: 'Every required section was present' },
];

export type Outcome = 'approved' | 'partly' | 'denied';

export interface Decision {
  outcome: Outcome;
  refund: number;
  lines: PriceLine[];
  redo: boolean;
  found: string;
}

export function managerDecision(checks: Checks, charged: Price, overcharge: number, want: Want): Decision {
  const find = (label: RegExp) => charged.lines.filter((l) => label.test(l.label));
  const words = find(/words/);
  const lines: PriceLine[] = [];
  const found: string[] = [];
  if (!checks.sourcesAgree) {
    lines.push(...find(/^check$/), ...words);
    found.push('a cited source does not say what the answer claimed');
  }
  if (!checks.desksExist) {
    lines.push(...find(/slip/));
    found.push('a named desk does not handle this call');
  }
  if (!checks.priceMatched && overcharge > 0) {
    lines.push({ label: 'over the posted price', tkn: overcharge });
    found.push('the charge was over the posted price');
  }
  if (!checks.sectionsPresent && checks.sourcesAgree) {
    const tenth = Math.round(words.reduce((n, l) => n + l.tkn, 0) * 0.1);
    if (tenth) lines.push({ label: '10% of the answer for a missing section', tkn: tenth });
    found.push('a required section was missing');
  }
  if (!checks.covered) {
    // Nothing covered the call: everything but the sort is refunded.
    const rest = charged.lines.filter((l) => l.label !== 'Sort' && !lines.includes(l));
    lines.push(...rest);
    found.push('the answer did not cover the call as asked');
  }
  const unique = lines.filter((l, i) => lines.indexOf(l) === i);
  const refund = unique.reduce((n, l) => n + l.tkn, 0);
  const total = charged.total + overcharge;
  const redo = want !== 'tokens' || refund === 0;
  if (refund === 0) return { outcome: 'denied', refund: 0, lines: [], redo: true, found: 'no failed checks' };
  if (refund >= total) return { outcome: 'approved', refund: total, lines: unique, redo, found: found.join('; ') };
  return { outcome: 'partly', refund, lines: unique, redo, found: found.join('; ') };
}

/** Monday 00:00 UTC of the week that holds the date, as an ISO string. */
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
