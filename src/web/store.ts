// Everything the browser keeps: the balance, the week, and every call with
// its price, answer, refunds and receipts. The Worker holds nothing.

import { ALLOWANCE, weekOf, type Checks, type Claim, type CostToYou, type Decision, type Price, type PriceLine, type Want } from '../shared/desk';
import type { Answer, Parts, SortResult } from '../shared/desk-schemas';

export interface Refund {
  kind: 'counter' | 'manager';
  reason: string;
  amount: number;
  lines: PriceLine[];
  why: string;
  at: string;
}

export interface Receipt {
  n: string;
  claim: Claim;
  cost: CostToYou;
  want: Want;
  checks: Checks;
  note: string;
  decision: Decision;
  at: string;
}

export interface Call {
  id: string;
  n: number;
  text: string;
  at: string;
  sort: SortResult;
  parts?: Parts;
  quote?: Price;
  charged?: Price;
  answer?: Answer;
  words?: number;
  refunds: Refund[];
  receipt?: Receipt;
  flagged: boolean;
  redo: boolean;
  /** The choice the person picked on the question back. */
  pick?: string;
}

export interface Store {
  week: string;
  balance: number;
  counterWeek: number;
  calls: Call[];
}

const KEY = 'nolla:desk';

export function load(now = new Date().toISOString()): Store {
  let s: Store | null = null;
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    s = null;
  }
  const week = weekOf(now);
  if (!s || typeof s.balance !== 'number') return { week, balance: ALLOWANCE, counterWeek: 0, calls: [] };
  if (s.week !== week) return { ...s, week, balance: ALLOWANCE, counterWeek: 0 };
  return s;
}

export function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // The session just will not survive a reload.
  }
}

export const callNumber = (n: number) => String(n).padStart(4, '0');
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
