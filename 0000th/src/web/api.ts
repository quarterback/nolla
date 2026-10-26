import type { ActBody, State } from '../shared/turn';

export interface ScenarioInfo {
  id: string;
  name: string;
  agent: string;
  opening: string;
  services: { name: string; operations: string[] }[];
  state: State;
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? 'Request failed');
  return body as T;
}

export const api = {
  health: () => fetch('/api/health').then(json<{ model: 'scripted' | 'off' | 'ready' | 'starting' }>),
  scenario: (id: string) => fetch(`/api/scenarios/${id}`).then(json<ScenarioInfo>),
  act: (body: ActBody) =>
    fetch('/api/act', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(
      json<{ state: State; check?: { code: string } }>,
    ),

  /** Streams one agent turn. onSay gets the agent's words as they arrive. */
  async turn(state: State, text: string, onSay: (s: string) => void): Promise<State> {
    const res = await fetch('/api/turn', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state, text }),
    });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({ error: 'Request failed' }))).error);
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let raw = '';
    let next: State | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const event = /^event: (.*)$/m.exec(frame)?.[1];
        const data = frame
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (!event || !data) continue;
        if (event === 'delta') {
          raw += JSON.parse(data) as string;
          onSay(saySoFar(raw));
        } else if (event === 'turn') {
          next = (JSON.parse(data) as { state: State }).state;
        } else if (event === 'error') {
          throw new Error(JSON.parse(data) as string);
        }
      }
    }
    if (!next) throw new Error('The model did not answer.');
    return next;
  },
};

/** Reads the "say" string out of a JSON object that is still arriving. */
export function saySoFar(raw: string): string {
  const start = raw.indexOf('"say"');
  if (start < 0) return '';
  const quote = raw.indexOf('"', raw.indexOf(':', start) + 1);
  if (quote < 0) return '';
  let out = '';
  for (let i = quote + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\') {
      const n = raw[i + 1];
      if (n === undefined) break;
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'u' ? '' : n;
      i += n === 'u' ? 5 : 1;
    } else if (ch === '"') break;
    else out += ch;
  }
  return out;
}
