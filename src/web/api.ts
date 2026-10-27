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
    return (await res.json()) as { model: 'scripted' | 'off' | 'ready' | 'starting' | 'rejected' };
  },
  sort: (text: string, earlierTurns: number) => post<{ sort: SortResult; quotes: Quote[] }>('/sort', { text, earlierTurns }),
  answer: (text: string, sort: SortResult, parts: Parts, earlierTurns: number) =>
    post<{ answer: Answer; words: number; charged: Price }>('/answer', { text, sort, parts, earlierTurns }),

  /** The same call as a stream. onRaw gets the JSON text as it arrives. */
  async answerStream(text: string, sort: SortResult, parts: Parts, earlierTurns: number, onRaw: (raw: string) => void): Promise<{ answer: Answer; words: number; charged: Price }> {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ text, sort, parts, earlierTurns }),
    });
    if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'The desk did not answer.');
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let raw = '';
    let done: { answer: Answer; words: number; charged: Price } | null = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buffer += value;
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const event = /^event: (.*)$/m.exec(frame)?.[1];
        const data = frame.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
        if (!event || !data) continue;
        if (event === 'delta') {
          raw += JSON.parse(data) as string;
          onRaw(raw);
        } else if (event === 'done') done = JSON.parse(data);
        else if (event === 'error') throw new Error(JSON.parse(data) as string);
      }
    }
    if (!done) throw new Error('The desk did not answer.');
    return done;
  },
  manager: (text: string, answer: Answer, parts: Parts, claim: string) => post<{ checks: ManagerChecks }>('/manager', { text, answer, parts, claim }),
};
