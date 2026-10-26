// The tour: every state of the desk from one fixed call, built in the
// browser from the scripted answers. Tour calls never touch the balance.

import { counterRefund, managerDecision, price } from '../shared/desk';
import { scriptedAnswer, scriptedManager, scriptedSort } from '../worker/script';
import type { Call } from './store';

export const TOUR_TEXT = 'My landlord kept my whole deposit for carpet wear. Can they do that?';
export const TOUR_BALANCE = 4480;
const PARTS = { slips: 1, sources: 2, words: 180, check: false };
const AT = '2026-10-26T09:41:07Z';

export type TourState = 'ask' | 'generating' | 'answered' | 'question' | 'counter' | 'manager' | 'approved' | 'partly' | 'denied';

export const TOUR: { key: TourState; name: string; what: string }[] = [
  { key: 'ask', name: 'Ask', what: 'The call typed, the price menu open' },
  { key: 'generating', name: 'Generating', what: 'The answer being written, the meter running' },
  { key: 'answered', name: 'Answered', what: 'The answer with its receipt' },
  { key: 'question', name: 'Question back', what: 'One question, answered No' },
  { key: 'counter', name: 'Counter', what: 'A refund for a wrong desk' },
  { key: 'manager', name: 'Manager', what: 'Three questions before a decision' },
  { key: 'approved', name: 'Approved', what: 'The facts were wrong: all of it back' },
  { key: 'partly', name: 'Partly approved', what: 'A missing section: 10% of the words back' },
  { key: 'denied', name: 'Denied', what: 'Every check passed: a free redo' },
];

/** The deposit call, answered and charged. */
export function tourCall(): Call {
  const sort = scriptedSort(TOUR_TEXT);
  const answer = scriptedAnswer(TOUR_TEXT, PARTS);
  const quote = price(PARTS, 0);
  return { id: 'tour', n: 1, text: TOUR_TEXT, at: AT, sort, parts: PARTS, quote, charged: quote, answer, words: 180, refunds: [], flagged: false, redo: false };
}

/** The call in the state the tour row names. */
export function tourState(key: TourState): Call {
  const call = tourCall();
  if (key === 'question') return { ...call, pick: 'No' };
  if (key === 'counter') {
    const r = counterRefund('desk', call.charged!, 0, 0);
    return { ...call, flagged: true, refunds: [{ kind: 'counter', reason: 'desk', amount: r.amount, lines: r.lines, why: r.why, at: AT }] };
  }
  if (key === 'approved' || key === 'partly' || key === 'denied') {
    const claim = key === 'approved' ? 'facts' : key === 'partly' ? 'asked' : 'other';
    const checks = { ...scriptedManager(claim), priceMatched: true };
    const want = key === 'denied' ? 'tokens' : 'both';
    const decision = managerDecision(checks, call.charged!, 0, want);
    return {
      ...call,
      flagged: true,
      redo: decision.redo,
      receipt: { n: '0001-R1', claim, cost: key === 'approved' ? 'trip' : key === 'partly' ? 'time' : 'tokens', want, checks, note: checks.note, decision, at: AT },
    };
  }
  return call;
}

/** The generating screen, frozen mid stream. */
export function tourGenerating() {
  const a = tourCall().answer!;
  const sentences = [a.short, a.known[0].text, a.known[1].text.slice(0, 64)];
  const words = sentences.join(' ').split(/\s+/).length;
  return { label: 'Answer with sources', fixed: 340, sentences, words };
}
