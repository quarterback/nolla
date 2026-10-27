import type { Answer } from '../shared/desk-schemas';
import { fmt, tkn, type Call } from './store';
import { MachineLine } from './Classification';

interface Props {
  call: Call;
  balance: number;
  busy: boolean;
  onPick: (pick: string) => void;
  onRefund: () => void;
  onRedo: () => void;
  onNew: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const EMPTY: Answer = { short: '', known: [], changes_if: [], desks: [], ask_someone: '', question_back: null, sources: [] };

export function AnswerPage({ call, balance, busy, onPick, onRefund, onRedo, onNew }: Props) {
  const bill = call.charged;
  // The model's own words: the first paragraph leads, the rest follow.
  const paragraphs = (call.reply ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const a = call.answer ?? (call.reply ? { ...EMPTY, short: paragraphs[0] ?? '', known: paragraphs.slice(1).map((text) => ({ text, source: 0 })) } : null);
  if (!a || !bill) return null;
  const refundedLabels = new Set(call.refunds.flatMap((r) => r.lines.map((l) => l.label)));
  const refunded = call.refunds.reduce((n, r) => n + r.amount, 0);
  const picked = a.question_back?.choices.find((c) => c.label === call.pick);
  const routed = a.desks.length > 0;
  const capped = !!call.quote && bill.formula === call.quote.formula && (call.words ?? 0) > 0 && !bill.lines.some((l) => l.label === `about ${call.words} words`);

  return (
    <article className="answer">
      <h1 className="headline">{call.text}</h1>
      <MachineLine call={call} />


      {a.short && <p className="short">{a.short}</p>}

      {a.known.length > 0 && (
        <section className="known">
          {a.known.map((k, i) => (
            <p key={i}>
              {k.text}
              {k.source > 0 && <sup>{k.source}</sup>}
            </p>
          ))}
        </section>
      )}

      {a.changes_if.length > 0 && (
        <section className="changes">
          <h2 className="kicker ruled">This answer changes if</h2>
          {a.changes_if.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </section>
      )}

      {routed && (
        <section className="handles">
          <h2 className="kicker ruled">Who handles this</h2>
          {a.desks.map((d) => (
            <p key={d.name} className="referral">
              <strong>{d.name}</strong>
              {d.url ? (
                <>
                  {' ('}
                  <a href={d.url} rel="noreferrer" target="_blank">
                    {d.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                  {')'}
                </>
              ) : null}
              . {d.what.replace(/\.$/, '')}. {d.cost.replace(/\.$/, '')}. Ask: {d.ask.replace(/[.?]$/, '')}? Bring {d.bring.charAt(0).toLowerCase() + d.bring.slice(1).replace(/\.$/, '')}.
            </p>
          ))}
          {a.ask_someone && <p className="referral">{a.ask_someone}</p>}
        </section>
      )}

      {a.question_back && (
        <section className="question">
          <h2 className="q-text">{a.question_back.text}</h2>
          <div className="choices">
            {a.question_back.choices.map((c) => (
              <button key={c.label} className={c.label === call.pick ? 'on' : ''} onClick={() => onPick(c.label)}>
                {c.label}
              </button>
            ))}
          </div>
          {picked && <p className="next">{picked.next}</p>}
        </section>
      )}

      {a.sources.length > 0 && (
        <section className="sources">
          {a.sources.map((s, i) => (
            <p key={i}>
              <sup>{i + 1}</sup>{' '}
              {s.url ? (
                <a href={s.url} rel="noreferrer" target="_blank">
                  {s.title}
                </a>
              ) : (
                s.title
              )}{' '}
              · {s.site}
            </p>
          ))}
        </section>
      )}

      <section className="grid">
        {bill.lines.map((l) => (
          <div key={l.label} className={`row ${refundedLabels.has(l.label) ? 'struck' : ''}`}>
            <span>{cap(l.label.replace(/^about /, ''))}</span>
            <span className="num">{tkn(l.tkn)}</span>
          </div>
        ))}
        <div className="row total">
          <span>Charged</span>
          <span className="num">{tkn(bill.total)}</span>
        </div>
        {refunded > 0 && (
          <div className="row total">
            <span>Refunded</span>
            <span className="num">{tkn(refunded)}</span>
          </div>
        )}
        <div className="row total">
          <span>Balance</span>
          <span className="num">{tkn(balance)}</span>
        </div>
        {(capped || call.flagged) && (
          <p className="machine">
            {capped ? `${call.words} words written, billed at the posted price` : ''}
            {capped && call.flagged ? ' · ' : ''}
            {call.flagged ? `flagged for review${call.receipt ? ` · decision receipt ${call.receipt.n}` : ''}` : ''}
          </p>
        )}
      </section>

      <div className="actions">
        {call.redo ? (
          <button className="primary" disabled={busy} onClick={onRedo}>
            Run the free redo
          </button>
        ) : (
          <button className="primary" onClick={onNew}>
            New call
          </button>
        )}
        <button className="quiet" onClick={onRefund}>
          Something was wrong
        </button>
      </div>
    </article>
  );
}
