import { useState } from 'react';
import { CHECK_LABELS, COUNTER_MAX, COUNTER_REASONS, COUNTER_WEEK_MAX, MANAGER_QUESTIONS, type Claim, type CostToYou, type CounterReason, type CounterResult, type Want } from '../shared/desk';
import { callNumber, fmt, type Call, type Store } from './store';

export function Counter({ call, store, onPick, onManager, onBack }: { call: Call; store: Store; onPick: (r: CounterReason) => CounterResult | null; onManager: () => void; onBack: () => void }) {
  const [result, setResult] = useState<CounterResult | null>(null);
  const charged = call.charged?.total ?? 0;
  return (
    <section className="counter">
      <p className="eyebrow">Counter · call {callNumber(call.n)} · charged {fmt(charged)} tkn · refunds this week {fmt(store.counterWeek)} of {fmt(COUNTER_WEEK_MAX)}</p>
      <h1 className="headline small">{call.text}</h1>
      {!result ? (
        <>
          <h2 className="kicker">What was wrong?</h2>
          <p className="lede-s">Pick the one that fits best. The counter refunds up to {COUNTER_MAX} tkn on the spot.</p>
          <div className="reasons">
            {COUNTER_REASONS.map((r) => (
              <button key={r.key} className="reason" onClick={() => setResult(onPick(r.key))}>
                {r.label}
              </button>
            ))}
          </div>
          <button className="quiet" onClick={onBack}>
            Back to the answer
          </button>
        </>
      ) : result.toManager ? (
        <>
          <h2 className="kicker">Goes to the manager</h2>
          <p className="lede-s">{result.why}</p>
          <div className="actions">
            <button className="primary" onClick={onManager}>
              Ask for a manager
            </button>
            <button className="quiet" onClick={onBack}>
              Back
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="kicker">Refunded {fmt(result.amount)} tkn</h2>
          <div className="lines">
            {result.lines.map((l) => (
              <div key={l.label} className="row">
                <span>{l.label}</span>
                <span className="num">{fmt(l.tkn)}</span>
              </div>
            ))}
          </div>
          <p className="lede-s">{result.why}</p>
          <p className="lede-s">Balance {fmt(store.balance)} tkn. {result.amount > 0 ? 'This answer is flagged for review.' : ''}</p>
          <div className="actions">
            <button className="primary" onClick={onBack}>
              Back to the answer
            </button>
            <button className="quiet" onClick={onManager}>
              Ask for a manager
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function Manager({ call, busy, onDecide, onRedo, onBack }: { call: Call; busy: boolean; onDecide: (claim: Claim, cost: CostToYou, want: Want) => void; onRedo: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const r = call.receipt;
  const charged = call.charged?.total ?? 0;

  if (r) {
    const d = r.decision;
    const title = { approved: 'Approved', partly: 'Partly approved', denied: 'Denied' }[d.outcome];
    const sub = d.outcome === 'denied' ? 'No tokens back. A free redo is yours.' : `${fmt(d.refund)} tkn back${d.redo ? ' and a free redo' : ''}`;
    return (
      <section className="manager">
        <p className="eyebrow manager-tag">Manager · decided</p>
        <p className="eyebrow">Call {callNumber(call.n)} · charged {fmt(charged)} tkn · counter limit {COUNTER_MAX} tkn</p>
        <h1 className="headline">{title}</h1>
        <p className="short">{sub}</p>
        <p className="lede-s">{r.note}</p>
        <h2 className="kicker">What was checked</h2>
        <div className="lines">
          {CHECK_LABELS.map((c) => (
            <div key={c.key} className="row">
              <span>{c.label}</span>
              <span className={`num ${r.checks[c.key] ? '' : 'no'}`}>{r.checks[c.key] ? 'Yes' : 'No'}</span>
            </div>
          ))}
        </div>
        <section className="receipt">
          <h2>Decision receipt {r.n}</h2>
          <p>Claim: {label(0, r.claim)}</p>
          <p>Cost to you: {label(1, r.cost)}</p>
          <p>Asked for: {label(2, r.want)}</p>
          <p>Found: {d.found}</p>
          <p>Refunded: {d.lines.length ? d.lines.map((l) => `${l.label} ${l.tkn}`).join(', ') : 'none'}{d.redo ? '; free redo' : ''}</p>
          <p>Decided by: manager desk, separate from the desk that answered</p>
          <p>Appeal: a person reviews appeals within 7 days</p>
        </section>
        <div className="actions">
          {d.redo ? (
            <button className="primary" disabled={busy} onClick={onRedo}>
              Run the free redo
            </button>
          ) : (
            <button className="primary" onClick={onBack}>
              Accept
            </button>
          )}
          <button className="quiet" onClick={onBack}>
            Ask a person to review this
          </button>
        </div>
        <p className="lede-s">The original answer is flagged and kept with this receipt.</p>
      </section>
    );
  }

  const q = MANAGER_QUESTIONS[step];
  const choose = (key: string) => {
    const next = [...picks.slice(0, step), key];
    setPicks(next);
    if (step < 2) setStep(step + 1);
    else onDecide(next[0] as Claim, next[1] as CostToYou, next[2] as Want);
  };
  return (
    <section className="manager">
      <p className="eyebrow manager-tag">Manager · {step + 1} of 3</p>
      <p className="eyebrow">Call {callNumber(call.n)} · charged {fmt(charged)} tkn · counter limit {COUNTER_MAX} tkn</p>
      <h1 className="headline small">{call.text}</h1>
      <h2 className="kicker">{q.q}</h2>
      <div className="reasons">
        {q.choices.map(([key, text]) => (
          <button key={key} className="reason" disabled={busy} onClick={() => choose(key)}>
            {text}
          </button>
        ))}
      </div>
      <div className="actions">
        {step > 0 && (
          <button className="quiet" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button className="quiet" onClick={onBack}>
          Leave it
        </button>
      </div>
    </section>
  );
}

function label(i: number, key: string) {
  const found = MANAGER_QUESTIONS[i].choices.find((c) => c[0] === key);
  return found ? found[1].toLowerCase() : key;
}
