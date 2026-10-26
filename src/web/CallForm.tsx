import { useState } from 'react';
import { options, price, type Option } from '../shared/desk';
import type { Parts } from '../shared/desk-schemas';
import { tkn } from './store';

interface Props {
  busy: boolean;
  problem: string | null;
  onAsk: (text: string, parts: Parts, label: string) => void;
  /** A call already typed, for the tour. */
  preset?: string;
}

/** Asking: the call typed, four priced options, one button. */
export function CallForm({ busy, problem, onAsk, preset }: Props) {
  const [text, setText] = useState(preset ?? '');
  const [pick, setPick] = useState<Option['key']>('sources');
  const opts = options('route');
  const chosen = opts.find((o) => o.key === pick) ?? opts[2];
  const ready = text.trim().length >= 3;

  return (
    <section className="askpage">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onAsk(text.trim(), { slips: chosen.slips, sources: chosen.sources, words: chosen.words, check: chosen.check }, chosen.label);
        }}
      >
        <label htmlFor="call" className="label">
          The call
        </label>
        <textarea id="call" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="The question, as you would say it" disabled={busy} autoFocus />
        <ul className="optionlist">
          {opts.map((o) => (
            <li key={o.key}>
              <button type="button" className={`option ${pick === o.key ? 'on' : ''}`} disabled={busy} onClick={() => setPick(o.key)} aria-pressed={pick === o.key}>
                <span className="o-label">{o.label}</span>
                <span className="o-price num">{tkn(price(o, 0).total)}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="submit" className="primary wide" disabled={busy || !ready}>
          {busy ? 'Sorting' : `Ask · ${tkn(price(chosen, 0).total)}`}
        </button>
        {problem && <p className="problem">{problem}</p>}
      </form>
    </section>
  );
}
