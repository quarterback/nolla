import { useState } from 'react';
import { SCHEDULE, options, price, usd, type Option } from '../shared/desk';
import type { Parts } from '../shared/desk-schemas';
import { fmt, tkn } from './store';

interface Props {
  busy: boolean;
  model: string;
  onAsk: (text: string, parts: Parts, label: string) => void;
  /** A call already typed, for the tour. */
  preset?: string;
}

const SAMPLES = [
  'My landlord kept my whole deposit for carpet wear. Can they do that?',
  'My toilet keeps running after it flushes. How do I fix it?',
  'I want to open a bubble tea shop on my block. Is it a good idea?',
  "Can I take ibuprofen for a headache? I'm on blood pressure medicine.",
];

/** Asking: the call typed, the four options priced under it, one button. */
export function CallForm({ busy, model, onAsk, preset }: Props) {
  const [text, setText] = useState(preset ?? '');
  const [pick, setPick] = useState<Option['key']>('sources');
  const opts = options('route');
  const chosen = opts.find((o) => o.key === pick) ?? opts[2];
  const quote = price(chosen, 0);
  const ready = text.trim().length >= 3;

  return (
    <section className="askpage">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) onAsk(text.trim(), { slips: chosen.slips, sources: chosen.sources, words: chosen.words, check: chosen.check }, chosen.label);
        }}
      >
        <label htmlFor="call" className="label">
          The call
        </label>
        <textarea id="call" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="The question, as you would say it" disabled={busy} autoFocus />
        <ul className="optionlist">
          {opts.map((o) => {
            const p = price(o, 0);
            return (
              <li key={o.key}>
                <button type="button" className={`option ${pick === o.key ? 'on' : ''}`} disabled={busy} onClick={() => setPick(o.key)} aria-pressed={pick === o.key}>
                  <span className="o-label">{o.label}</span>
                  <span className="o-price num">{tkn(p.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <dl className="quote-lines" aria-label={chosen.label}>
          {quote.lines.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd className="num">{tkn(line.tkn)}</dd>
            </div>
          ))}
        </dl>
        <button type="submit" className="primary wide" disabled={busy || !ready}>
          {busy ? 'Sorting' : `Ask · ${tkn(quote.total)}`}
        </button>
        <p className="machine">
          sort {tkn(SCHEDULE.sort)} charged on ask · about ${fmt(usd(quote.total), 3)}
          {model === 'starting' ? ' · model starting' : model === 'scripted' ? ' · scripted answers' : ''}
        </p>
      </form>
      <h2 className="kicker ruled">Sample calls</h2>
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
