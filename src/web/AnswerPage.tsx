import { footprint, usd } from '../shared/desk';
import { fmt, callNumber, type Call } from './store';

interface Props {
  call: Call;
  busy: boolean;
  onPick: (pick: string) => void;
  onRefund: () => void;
  onRedo: () => void;
  onNew: () => void;
}

export function AnswerPage({ call, busy, onPick, onRefund, onRedo, onNew }: Props) {
  const a = call.answer;
  const bill = call.charged;
  if (!a || !bill) return null;
  const fp = footprint(bill.total);
  const refunded = call.refunds.reduce((n, r) => n + r.amount, 0);
  const picked = a.question_back?.choices.find((c) => c.label === call.pick);
  const routed = a.desks.length > 0;
  const capped = !!call.quote && bill.formula === call.quote.formula && (call.words ?? 0) > 0 && !bill.lines.some((l) => l.label === `about ${call.words} words`);

  return (
    <article className="answer">
      <p className="eyebrow">Call {callNumber(call.n)} · {new Date(call.at).toISOString().slice(11, 16)} · {bill.total} tkn</p>
      <h1 className="headline">{call.text}</h1>
      <p className="price-line">
        <span className="price-total">Price {fmt(bill.total)} tkn</span>
        <span className="price-formula">{bill.formula}</span>
      </p>

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
          <h2>This answer changes if</h2>
          {a.changes_if.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </section>
      )}

      {routed && (
        <section className="desks">
          <h2 className="big">Who handles this</h2>
          {a.desks.map((d) => (
            <div key={d.name} className="desk">
              <p className="desk-name">{d.name}</p>
              <p>{d.what}</p>
              <p className="desk-meta">
                <span>Cost {d.cost}</span>
                <span>Bring {d.bring}</span>
              </p>
              {d.url && (
                <a href={d.url} rel="noreferrer" target="_blank">
                  {d.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          ))}
          {a.ask_someone && (
            <div className="desk">
              <p className="desk-name">Someone who has done this</p>
              <p>{a.ask_someone}</p>
            </div>
          )}
        </section>
      )}

      {a.question_back && (
        <section className="question">
          <p className="q-text">{a.question_back.text}</p>
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
          <h2>Sources</h2>
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

      <section className="bill">
        <h2>Bill</h2>
        {bill.lines.map((l) => (
          <div key={l.label} className="row">
            <span>{l.label}</span>
            <span className="num">{fmt(l.tkn)}</span>
          </div>
        ))}
        <div className="row total">
          <span>Charged</span>
          <span className="num">{fmt(bill.total)} tkn · ${fmt(usd(bill.total), 4)}</span>
        </div>
        {refunded > 0 && (
          <div className="row refund">
            <span>Refunded</span>
            <span className="num">{fmt(refunded)} tkn</span>
          </div>
        )}
        <p className="footprint">
          {a.known.length ? `${call.words} words written${capped ? ', billed at the posted price' : ''}. ` : ''}Energy {fmt(fp.wh, 2)} Wh · water {fmt(fp.ml, 1)} mL · carbon {fmt(fp.g, 3)} g CO2e. Simulated.
        </p>
        {call.flagged && <p className="flag">Flagged for review{call.receipt ? ` · decision receipt ${call.receipt.n}` : ''}.</p>}
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
