import { useEffect, useRef, useState } from 'react';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  /** Timing and token counts, once the reply is done. */
  stats?: Stats;
}

interface Stats {
  /** Milliseconds from send to the first token. */
  first: number;
  /** Milliseconds from send to the last token. */
  total: number;
  /** Tokens the model wrote, when the endpoint reports them. */
  completion: number;
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const n = (x: number) => x.toLocaleString('en-US');

/** The meter under the latest reply: words while it writes, then the
 * model's timing and a switch for its reasoning. */
function Meter({ turn, writing, showing, onToggle }: { turn: Turn; writing: boolean; showing: boolean; onToggle: () => void }) {
  let right = '';
  if (!writing && turn.stats) {
    const { first, total, completion } = turn.stats;
    const streaming = (total - first) / 1000;
    const parts = [`first token ${n(Math.round(first))} ms`];
    if (completion) parts.push(`${n(completion)} tokens`);
    parts.push(`${(total / 1000).toFixed(1)} s`);
    if (completion && streaming >= 0.25) parts.push(`${n(Math.round(completion / streaming))} tokens/s`);
    right = parts.join(' · ');
  }
  return (
    <div className="chat-meter">
      {writing ? (
        <span>writing · {n(words(turn.content))} words</span>
      ) : turn.reasoning ? (
        <button type="button" className="chat-toggle" aria-expanded={showing} onClick={onToggle}>
          reasoning
        </button>
      ) : (
        <span />
      )}
      {right && <span>{right}</span>}
    </div>
  );
}

/** The model as it runs: text in, the model's own text out, streamed, with
 * its timing. No price, no balance, no sort. */
export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const history = [...turns.map((t) => ({ role: t.role, content: t.content })), { role: 'user' as const, content: text }];
    setTurns((t) => [...t, { role: 'user', content: text, reasoning: '' }, { role: 'assistant', content: '', reasoning: '' }]);
    setDraft('');
    setReasoningOpen(false);
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
          if (event === 'delta') {
            if (!first) first = performance.now() - t0;
            const d = body as { c: string; r: string };
            patch((t) => ({ ...t, content: t.content + d.c, reasoning: t.reasoning + d.r }));
          } else if (event === 'usage') completion = (body as { completion: number }).completion;
          else if (event === 'error') throw new Error(body as string);
        }
      }
      const total = performance.now() - t0;
      patch((t) => ({ ...t, stats: { first, total, completion } }));
    } catch (e) {
      setProblem((e as Error).message);
      setTurns((all) => (all.length && !all[all.length - 1].content && !all[all.length - 1].reasoning ? all.slice(0, -1) : all));
    } finally {
      setBusy(false);
    }
  };

  const empty = turns.length === 0;
  const lines = draft.split('\n').length;

  return (
    <section className={`chat${empty ? ' chat--empty' : ''}`}>
      <div className="chat-log">
        {turns.map((t, i) => {
          const last = i === turns.length - 1;
          if (t.role === 'user') {
            return (
              <h2 key={i} className="chat-q">
                {t.content}
              </h2>
            );
          }
          const writing = busy && last;
          const paragraphs = t.content.split(/\n{2,}/);
          const showing = last && (reasoningOpen || (writing && !t.content));
          return (
            <div key={i} className="chat-a">
              <div className="chat-reply">
                {paragraphs.map((p, j) => (
                  <p key={j}>
                    {p}
                    {writing && j === paragraphs.length - 1 && <span className="cursor small" aria-hidden="true" />}
                  </p>
                ))}
              </div>
              {last && <Meter turn={t} writing={writing} showing={showing} onToggle={() => setReasoningOpen((o) => !o)} />}
              {showing && t.reasoning && <p className="chat-reasoning">{t.reasoning}</p>}
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {problem && <p className="problem">{problem}</p>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="say" className="sr-only">
          Message
        </label>
        <textarea
          id="say"
          rows={empty ? 3 : Math.min(6, Math.max(1, lines))}
          value={draft}
          placeholder="The question, as you would say it"
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
        {!empty && (
          <button type="button" className="quiet chat-clear" onClick={() => { setTurns([]); setProblem(null); }} disabled={busy}>
            Clear
          </button>
        )}
        <button type="submit" className="send" disabled={busy || !draft.trim()}>
          {busy ? 'Writing' : 'Send'}
        </button>
      </form>
    </section>
  );
}
