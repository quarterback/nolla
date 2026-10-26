import { useState } from 'react';
import { SCHEDULE, usd } from '../shared/desk';
import type { Quote } from './api';
import { fmt, type Call } from './store';

interface Props {
  busy: boolean;
  model: string;
  onSort: (text: string) => Promise<{ call: Call; quotes: Quote[] } | null>;
  onRun: (call: Call, quote: Quote) => void;
}

const SAMPLES = [
  'My landlord kept my whole deposit for carpet wear. Can they do that?',
  'My toilet keeps running after it flushes. How do I fix it?',
  'I want to open a bubble tea shop on my block. Is it a good idea?',
  "Can I take ibuprofen for a headache? I'm on blood pressure medicine.",
];

export function CallForm({ busy, model, onSort, onRun }: Props) {
  const [text, setText] = useState('');
  const [sorted, setSorted] = useState<{ call: Call; quotes: Quote[] } | null>(null);

  const sort = async () => {
    const r = await onSort(text.trim());
    if (r) setSorted(r);
  };

  if (sorted) {
    const { call, quotes } = sorted;
    const where = { desk: 'Answered at the desk', route: 'Routed to a desk', both: 'Routed, with a short answer' }[call.sort.sort];
    return (
      <section className="sortpage">
        <p className="eyebrow">Call {String(call.n).padStart(4, '0')} · sorted · {SCHEDULE.sort} tkn charged</p>
        <h1 className="headline">{call.text}</h1>
        <p className="sorted">{where}. {call.sort.category}{call.sort.place ? `, ${call.sort.place}` : ''}.</p>
        <h2 className="kicker">Price</h2>
        <div className="quotes">
          {quotes.map((q) => (
            <button key={q.key} className="quote" disabled={busy} onClick={() => onRun(call, q)}>
              <span className="q-top">
                <span className="q-label">{q.label}</span>
                <span className="q-price">{fmt(q.price.total)} tkn</span>
              </span>
              <span className="q-formula">{q.price.formula}</span>
              <span className="q-does">{q.does} · about ${fmt(usd(q.price.total), 3)}</span>
            </button>
          ))}
        </div>
        <button className="quiet" onClick={() => setSorted(null)} disabled={busy}>
          Edit the call
        </button>
      </section>
    );
  }

  return (
    <section className="callpage">
      <h1 className="display">Ask the desk.</h1>
      <p className="lede">Every call is sorted, priced in the open, and sent to the people who handle it. Answers only when they belong here.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) void sort();
        }}
      >
        <label htmlFor="call" className="eyebrow">
          The call
        </label>
        <textarea id="call" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type the question as you would say it" disabled={busy} />
        <div className="actions">
          <button type="submit" className="primary" disabled={busy || text.trim().length < 3}>
            {busy ? 'Sorting' : `Sort the call · ${SCHEDULE.sort} tkn`}
          </button>
          <span className="hint">{model === 'starting' ? 'Model starting' : model === 'scripted' ? 'Scripted answers' : ''}</span>
        </div>
      </form>
      <h2 className="kicker">Calls other people brought</h2>
      <ul className="samples">
        {SAMPLES.map((s) => (
          <li key={s}>
            <button className="sample" onClick={() => setText(s)} disabled={busy}>
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
