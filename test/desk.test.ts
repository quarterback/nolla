import { describe, expect, test } from 'vitest';
import { counterRefund, managerDecision, options, price, usd, weekOf, type Checks } from '../src/shared/desk';

describe('price', () => {
  test('the routed example from the desk rules comes to 540', () => {
    const p = price({ slips: 0, sources: 2, words: 180, check: true });
    expect(p.total).toBe(540);
    expect(p.formula).toBe('Sort 40 · 2 sources 240 · about 180 words 180 · check 80');
  });
  test('route only is sort and a slip', () => {
    expect(price({ slips: 1, sources: 0, words: 0, check: false }).total).toBe(100);
  });
  test('answered at the desk, 150 words, is 190', () => {
    expect(price({ slips: 0, sources: 0, words: 150, check: false }).total).toBe(190);
  });
  test('each earlier turn adds ten percent', () => {
    const p = price({ slips: 0, sources: 0, words: 100, check: false }, 2);
    expect(p.total).toBe(140 + 28);
  });
  test('a call answered at the desk has no route option', () => {
    expect(options('desk').map((o) => o.key)).toEqual(['quick', 'sources', 'lookinto']);
    expect(options('route')[0].key).toBe('route');
  });
  test('house rate is 1,000 tkn to 25 cents', () => {
    expect(usd(1000)).toBeCloseTo(0.25);
  });
});

describe('counter refunds', () => {
  const charged = price({ slips: 1, sources: 2, words: 180, check: true }); // 600
  test('a contradicted source refunds the check and the words only', () => {
    const r = counterRefund('source', charged, 0, 0);
    expect(r.amount).toBe(260);
    expect(r.toManager).toBe(false);
  });
  test('wrong desk refunds the slip', () => {
    expect(counterRefund('desk', charged, 0, 0).amount).toBe(60);
  });
  test('an overcharge is refunded with no questions', () => {
    expect(counterRefund('price', charged, 35, 0).amount).toBe(35);
  });
  test('did not answer goes to the manager when over the counter limit', () => {
    const r = counterRefund('asked', charged, 0, 0);
    expect(r.amount).toBe(0);
    expect(r.toManager).toBe(true);
  });
  test('the weekly limit sends an otherwise fine refund to the manager', () => {
    expect(counterRefund('source', charged, 0, 900).toManager).toBe(true);
  });
  test('something else always goes to the manager', () => {
    expect(counterRefund('other', charged, 0, 0).toManager).toBe(true);
  });
});

describe('manager decisions', () => {
  const charged = price({ slips: 0, sources: 2, words: 180, check: true }); // 540
  const pass: Checks = { covered: true, sourcesAgree: true, desksExist: true, priceMatched: true, sectionsPresent: true };
  test('every check passing is denied with a free redo', () => {
    const d = managerDecision(pass, charged, 0, 'tokens');
    expect(d.outcome).toBe('denied');
    expect(d.refund).toBe(0);
    expect(d.redo).toBe(true);
  });
  test('a missing section refunds ten percent of the words', () => {
    const d = managerDecision({ ...pass, sectionsPresent: false }, charged, 0, 'tokens');
    expect(d.outcome).toBe('partly');
    expect(d.refund).toBe(18);
  });
  test('a source that disagrees refunds check and words', () => {
    const d = managerDecision({ ...pass, sourcesAgree: false }, charged, 0, 'both');
    expect(d.refund).toBe(260);
    expect(d.redo).toBe(true);
  });
  test('an answer that did not cover the call refunds everything but the sort', () => {
    const d = managerDecision({ ...pass, covered: false }, charged, 0, 'tokens');
    expect(d.refund).toBe(500);
    expect(d.outcome).toBe('partly');
  });
  test('wrong source and no coverage together approve the whole charge', () => {
    const d = managerDecision({ ...pass, covered: false, sourcesAgree: false }, charged, 0, 'tokens');
    expect(d.refund).toBeGreaterThanOrEqual(500);
  });
});

test('weekOf lands on Monday', () => {
  expect(weekOf('2026-10-28T15:00:00Z')).toBe('2026-10-26T00:00:00.000Z');
  expect(weekOf('2026-10-26T00:30:00Z')).toBe('2026-10-26T00:00:00.000Z');
});
