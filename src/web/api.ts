import type { Option, Price } from '../shared/desk';
import type { Answer, ManagerChecks, Parts, SortResult } from '../shared/desk-schemas';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'The desk did not answer.');
  return json as T;
}

export type Quote = Option & { price: Price };

export const api = {
  health: async () => {
    const res = await fetch('/api/health');
    return (await res.json()) as { model: 'scripted' | 'off' | 'ready' | 'starting' };
  },
  sort: (text: string, earlierTurns: number) => post<{ sort: SortResult; quotes: Quote[] }>('/sort', { text, earlierTurns }),
  answer: (text: string, sort: SortResult, parts: Parts, earlierTurns: number) =>
    post<{ answer: Answer; words: number; charged: Price }>('/answer', { text, sort, parts, earlierTurns }),
  manager: (text: string, answer: Answer, parts: Parts, claim: string) => post<{ checks: ManagerChecks }>('/manager', { text, answer, parts, claim }),
};
