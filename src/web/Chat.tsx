import { useEffect, useRef, useState } from 'react';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  /** Timing and token counts, once the reply is done. */
  stats?: string;
}

/** The model as it runs: text in, the model's own text out, streamed, with
 * its timing. No price, no balance, no sort. */
export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [turns]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const history = [...turns.map((t) => ({ role: t.role, content: t.content })), { role: 'user' as const, content: text }];
    setTurns((t) => [...t, { role: 'user', content: text, reasoning: '' }, { role: 'assistant', content: '', reasoning: '' }]);
    setDraft('');
    setBusy(true);
    setProblem(null);
    const t0 = performance.now();
    let first = 0;
    let completion = 0;
    const patch = (fn: (t: Turn) => Turn) => setTurns((all) => all.map((t, i) => (i === all.length - 1 ? fn(t) : t)));
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history }) });
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'The model did not answer.');
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const event = /^event: (.*)$/m.exec(frame)?.[1];
          const data = frame.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
          if (!event || !data) continue;
          const body = JSON.parse(data);
          if (event === 'meta') setModel((body as { model: string }).model);
          else if (event === 'delta') {
            if (!first) first = performance.now() - t0;
            const d = body as { c: string; r: string };
            patch((t) => ({ ...t, content: t.content + d.c, reasoning: t.reasoning + d.r }));
          } else if (event === 'usage') completion = (body as { completion: number }).completion;
          else if (event === 'error') throw new Error(body as string);
        }
      }
      const total = performance.now() - t0;
      const parts = [`${Math.round(first)} ms to first token`, `${(total / 1000).toFixed(1)} s`];
      if (completion) parts.push(`${completion} tokens`, `${(completion / Math.max(0.001, (total - first) / 1000)).toFixed(1)} tokens/s`);
      patch((t) => ({ ...t, stats: parts.join(' · ') }));
    } catch (e) {
      setProblem((e as Error).message);
      setTurns((all) => (all.length && !all[all.length - 1].content && !all[all.length - 1].reasoning ? all.slice(0, -1) : all));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chat">
      <div className="chat-top">
        <span className="machine">{model || 'model'}</span>
        <button className="quiet" onClick={() => { setTurns([]); setProblem(null); }} disabled={busy || !turns.length}>
          Clear
        </button>
      </div>
      <div className="chat-log">
        {turns.map((t, i) => (
          <div key={i} className={`turn ${t.role}`}>
            <p className="who">{t.role === 'user' ? 'you' : model || 'model'}</p>
            {t.reasoning && <p className="reasoning">{t.reasoning}</p>}
            <p className="said">{t.content}{busy && i === turns.length - 1 && t.role === 'assistant' && <span className="cursor small" aria-hidden="true" />}</p>
            {t.stats && <p className="machine">{t.stats}</p>}
          </div>
        ))}
        <div ref={end} />
      </div>
      {problem && <p className="problem">{problem}</p>}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="say" className="label">
          Message
        </label>
        <textarea
          id="say"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={busy}
          autoFocus
        />
        <button type="submit" className="primary wide" disabled={busy || !draft.trim()}>
          {busy ? 'Writing' : 'Send'}
        </button>
      </form>
    </section>
  );
}
