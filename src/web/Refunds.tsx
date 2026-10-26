import { useState } from 'react';
import { CHECK_LABELS, COUNTER_MAX, COUNTER_REASONS, COUNTER_WEEK_MAX, MANAGER_QUESTIONS, type Claim, type CostToYou, type CounterReason, type CounterResult, type Want } from '../shared/desk';
import { callNumber, fmt, type Call, type Store } from './store';

export function Counter({ call, store, onPick, onManager, onBack }: { call: Call; store: Store; onPick: (r: CounterReason) => CounterResult | null; onManager: () => void; onBack: () => void }) {
  const [picked, setPicked] = useState<CounterReason | null>(null);
  const [result, setResult] = useState<CounterResult | null>(null);
  const bill = call.charged;
  if (!bill) return null;
  const struck = new Set(result?.lines.map((l) => l.label));
  const kept = bill.lines.filter((l) => !struck.has(l.label)).map((l) => name(l.label));
  const gone = result?.lines.map((l) => name(l.label)) ?? [];

  return (
    <section className="counter">
      <h1 className="headline">Counter</h1>
      <p className="machine">
        call {callNumber(call.n)} · limit {COUNTER_MAX} tkn · used this week {fmt(store.counterWeek)} of {fmt(COUNTER_WEEK_MAX)}
      </p>
      <h2 className="kicker ruled">What was wrong?</h2>
      <ul className="optionlist">
        {COUNTER_REASONS.map((r) => (
          <li key={r.key}>
            <button
              className={`option ${picked === r.key ? 'on' : ''}`}
              disabled={!!result}
              onClick={() => {
                setPicked(r.key);
                setResult(onPick(r.key));
              }}
            >
              <span className="marker" aria-hidden="true" />
              <span className="o-label">{r.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {result && !result.toManager && (
        <>
          <section className="grid">
            {result.amount > 0 && (
              <div className="grid-stamp">
                <span className="stamp">Refunded</span>
              </div>
            )}
            {bill.lines.map((l) => (
              <div key={l.label} className={`row ${struck.has(l.label) ? 'struck' : ''}`}>
                <span>{cap(l.label.replace(/^about /, ''))}</span>
                <span className="num">{fmt(l.tkn)}</span>
              </div>
            ))}
            <div className="row total">
              <span>Refunded</span>
              <span className="num">{fmt(result.amount)}</span>
            </div>
          </section>
          <p className="lede-s">
            {gone.length ? `${list(gone)} ${gone.length > 1 ? 'are' : 'is'} refunded. ` : ''}
            {kept.length ? `${list(kept)} stay${kept.length > 1 ? '' : 's'} charged. ` : ''}
            {result.amount > 0 ? 'This answer is flagged for review.' : result.why}
          </p>
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
      {result && result.toManager && (
        <>
          <p className="lede-s">{result.why}</p>
          <div className="actions">
            <button className="primary" onClick={onManager}>
              Ask for a manager
            </button>
            <button className="quiet" onClick={onBack}>
              Back to the answer
            </button>
          </div>
        </>
      )}
      {!result && (
        <div className="actions">
          <button className="quiet" onClick={onBack}>
            Back to the answer
          </button>
        </div>
      )}
    </section>
  );
}

/** A bill line as a phrase: "about 180 words" is "the answer words". */
function name(label: string) {
  if (/words/.test(label)) return 'the answer words';
  if (/^Sort$/.test(label)) return 'sorting';
  if (/slip/.test(label)) return 'the slip';
  if (/source/.test(label)) return 'the sources';
  if (/^check$/.test(label)) return 'the check';
  return label;
}

function list(items: string[]) {
  const l = items.map((s) => s.toLowerCase());
  if (l.length <= 1) return cap(l.join(''));
  return cap(`${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Manager({ call, busy, onDecide, onRedo, onBack }: { call: Call; busy: boolean; onDecide: (claim: Claim, cost: CostToYou, want: Want) => void; onRedo: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const r = call.receipt;
  const charged = call.charged?.total ?? 0;
  const answers = (r ? [r.claim, r.cost, r.want] : picks) as string[];

  const answered = (
    <dl className="answers">
      {MANAGER_QUESTIONS.slice(0, answers.length).map((q, i) => (
        <div key={q.key} className="row">
          <dt>{['Went wrong', 'Cost you', 'Wants'][i]}</dt>
          <dd>{label(i, answers[i])}</dd>
        </div>
      ))}
    </dl>
  );

  if (r) {
    const d = r.decision;
    const title = { approved: 'Approved', partly: 'Partly approved', denied: 'Denied' }[d.outcome];
    const refundLine = d.lines.length ? `${fmt(d.refund)} tkn, ${d.lines.map((l) => l.label.replace(/^about /, '')).join(' and ')}` : 'none';
    const why = [
      r.checks.covered ? 'The answer covered the call, so the full charge stays.' : 'The answer did not cover the call.',
      d.refund > 0 ? `${r.note.replace(/\.$/, '')}, so ${fmt(d.refund)} tkn come back.` : d.outcome === 'denied' ? 'Every check passed. A free redo is open on this call.' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <section className="manager">
        <h1 className="headline">Manager</h1>
        <p className="machine">
          call {callNumber(call.n)} · charged {fmt(charged)} tkn · counter limit {COUNTER_MAX} tkn
        </p>
        {answered}
        <h2 className="kicker ruled">Checked</h2>
        <div className="checks">
          {CHECK_LABELS.map((c) => (
            <div key={c.key} className="row">
              <span>{c.label}</span>
              <span className={`yn ${r.checks[c.key] ? '' : 'no'}`}>{r.checks[c.key] ? 'Yes' : 'No'}</span>
            </div>
          ))}
        </div>
        <div className="sheet receipt">
          <p className="receipt-title">Decision receipt {r.n}</p>
          <dl className="slip-lines">
            <dt>Found</dt>
            <dd>{cap(d.found)}</dd>
            <dt>Refund</dt>
            <dd>
              {refundLine}
              {d.redo ? '; free redo' : ''}
            </dd>
            <dt>By</dt>
            <dd>Manager desk, separate from the desk that answered</dd>
            <dt>Appeal</dt>
            <dd>A person reviews appeals within 7 days</dd>
          </dl>
          <span className="stamp sheet-stamp">{title}</span>
        </div>
        <p className="lede-s">{why}</p>
        <div className="stack">
          {d.redo ? (
            <button className="primary wide" disabled={busy} onClick={onRedo}>
              Run the free redo
            </button>
          ) : (
            <button className="primary wide" onClick={onBack}>
              Accept
            </button>
          )}
          <button className="outline wide" onClick={onBack}>
            Ask a person to review this
          </button>
        </div>
        <p className="machine">the receipt stays with the call</p>
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
      <h1 className="headline">Manager</h1>
      <p className="machine">
        call {callNumber(call.n)} · claim over the counter limit · {step + 1} of 3
      </p>
      {picks.length > 0 && answered}
      <h2 className="kicker ruled">{q.q}</h2>
      <ul className="optionlist">
        {q.choices.map(([key, text]) => (
          <li key={key}>
            <button className="option" disabled={busy} onClick={() => choose(key)}>
              <span className="marker" aria-hidden="true" />
              <span className="o-label">{text}</span>
            </button>
          </li>
        ))}
      </ul>
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
  return found ? found[1] : key;
}
