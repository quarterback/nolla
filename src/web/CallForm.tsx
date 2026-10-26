import { useState } from 'react';
import { SCHEDULE, options, price, usd, type Option, type Price } from '../shared/desk';
import type { Parts } from '../shared/desk-schemas';
import { fmt, type Call } from './store';
import { Classification, Pieces } from './Classification';

interface Props {
  busy: boolean;
  model: string;
  onSort: (text: string) => Promise<Call | null>;
  onRun: (call: Call, parts: Parts, quote: Price) => void;
}

const SAMPLES = [
  'My landlord kept my whole deposit for carpet wear. Can they do that?',
  'My toilet keeps running after it flushes. How do I fix it?',
  'I want to open a bubble tea shop on my block. Is it a good idea?',
  "Can I take ibuprofen for a headache? I'm on blood pressure medicine.",
];

const WORDS = [0, 100, 180, 300];
/** The formula as the boards show it: lower case, no estimate word. */
const show = (f: string) => f.toLowerCase().replace(/about /g, '');

export function CallForm({ busy, model, onSort, onRun }: Props) {
  const [text, setText] = useState('');
  const [call, setCall] = useState<Call | null>(null);
  const [parts, setParts] = useState<Parts>({ slips: 1, sources: 2, words: 180, check: false });

  const sort = async () => {
    const c = await onSort(text.trim());
    if (c) {
      setCall(c);
      const first = options(c.sort.sort).find((o) => o.key === 'sources') ?? options(c.sort.sort)[0];
      setParts({ slips: first.slips, sources: first.sources, words: first.words, check: first.check });
    }
  };

  if (call) {
    const opts = options(call.sort.sort);
    const quote = price(parts, 0);
    const same = (o: Option) => o.slips === parts.slips && o.sources === parts.sources && o.words === parts.words && o.check === parts.check;
    const set = (p: Partial<Parts>) => setParts({ ...parts, ...p });
    const routed = call.sort.sort !== 'desk';
    return (
      <section className="sortpage">
        <h1 className="headline">{call.text}</h1>
        <Pieces text={call.text} tail={`sorted · ${SCHEDULE.sort} tkn`} />
        <Classification call={call} />

        <h2 className="kicker ruled">Choose what the desk does</h2>
        <ul className="optionlist">
          {opts.map((o) => (
            <li key={o.key}>
              <button className={`option ${same(o) ? 'on' : ''}`} disabled={busy} onClick={() => set({ slips: o.slips, sources: o.sources, words: o.words, check: o.check })}>
                <span className="marker" aria-hidden="true" />
                <span className="o-label">{o.label}</span>
                <span className="o-price num">{fmt(price(o, 0).total)} tkn</span>
                <span className="o-formula">{show(price(o, 0).formula)}</span>
              </button>
            </li>
          ))}
        </ul>

        <table className="form">
          <caption>Or set the form by hand</caption>
          <thead>
            <tr>
              <th scope="col">Work</th>
              <th scope="col">Count</th>
              <th scope="col">Charge</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Sort</th>
              <td className="num">1</td>
              <td className="num">{SCHEDULE.sort}</td>
            </tr>
            {routed && (
              <tr>
                <th scope="row">Slip</th>
                <td>
                  <button className="cell" onClick={() => set({ slips: parts.slips ? 0 : 1 })} aria-pressed={parts.slips === 1}>
                    {parts.slips}
                  </button>
                </td>
                <td className="num">{parts.slips * SCHEDULE.slip}</td>
              </tr>
            )}
            <tr>
              <th scope="row">Sources</th>
              <td>
                <span className="stepper">
                  <button className="cell" onClick={() => set({ sources: Math.max(0, parts.sources - 1) })} aria-label="Fewer sources">
                    −
                  </button>
                  <span className="num">{parts.sources}</span>
                  <button className="cell" onClick={() => set({ sources: Math.min(4, parts.sources + 1) })} aria-label="More sources">
                    +
                  </button>
                </span>
              </td>
              <td className="num">{parts.sources * SCHEDULE.source}</td>
            </tr>
            <tr>
              <th scope="row">Words</th>
              <td>
                <span className="stepper">
                  {WORDS.map((w) => (
                    <button key={w} className={`cell ${parts.words === w ? 'on' : ''}`} onClick={() => set({ words: w })} aria-pressed={parts.words === w}>
                      {w}
                    </button>
                  ))}
                </span>
              </td>
              <td className="num">{parts.words * SCHEDULE.word}</td>
            </tr>
            <tr>
              <th scope="row">Check</th>
              <td>
                <button className="cell" onClick={() => set({ check: !parts.check })} aria-pressed={parts.check}>
                  {parts.check ? 'on' : 'off'}
                </button>
              </td>
              <td className="num">{parts.check ? SCHEDULE.check : 0}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td className="num">{fmt(quote.total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="formula">{show(quote.formula)}</p>

        <button className="primary wide" disabled={busy || (parts.words === 0 && parts.slips === 0)} onClick={() => onRun(call, parts, quote)}>
          {busy ? 'Running' : `Run for ${fmt(quote.total)} tkn`}
        </button>
        <div className="actions">
          <span className="hint">about ${fmt(usd(quote.total), 3)}</span>
          <button className="quiet" onClick={() => setCall(null)} disabled={busy}>
            Edit the call
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="callpage">
      <h1 className="display">Ask the desk.</h1>
      <p className="lede">The desk sorts each call, posts a price, and names the people and places that handle it. Some calls get an answer here.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) void sort();
        }}
      >
        <label htmlFor="call" className="label">
          The call
        </label>
        <textarea id="call" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="The question, as you would say it" disabled={busy} />
        <Pieces text={text} />
        <div className="actions">
          <button type="submit" className="primary" disabled={busy || text.trim().length < 3}>
            {busy ? 'Sorting' : `Sort the call for ${SCHEDULE.sort} tkn`}
          </button>
          <span className="hint">{model === 'starting' ? 'Model starting' : model === 'scripted' ? 'Scripted answers' : ''}</span>
        </div>
      </form>
      <h2 className="kicker">Sample calls</h2>
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
