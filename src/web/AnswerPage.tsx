import { footprint, usd } from '../shared/desk';
import { fmt, type Call } from './store';
import { MachineLine } from './Classification';

interface Props {
  call: Call;
  busy: boolean;
  onPick: (pick: string) => void;
  onRefund: () => void;
  onRedo: () => void;
  onNew: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AnswerPage({ call, busy, onPick, onRefund, onRedo, onNew }: Props) {
  const a = call.answer;
  const bill = call.charged;
  if (!a || !bill) return null;
  const fp = footprint(bill.total);
  const refundedLabels = new Set(call.refunds.flatMap((r) => r.lines.map((l) => l.label)));
  const refunded = call.refunds.reduce((n, r) => n + r.amount, 0);
  const picked = a.question_back?.choices.find((c) => c.label === call.pick);
  const routed = a.desks.length > 0;
  const capped = !!call.quote && bill.formula === call.quote.formula && (call.words ?? 0) > 0 && !bill.lines.some((l) => l.label === `about ${call.words} words`);
  const [first, ...rest] = a.desks;

  return (
    <article className="answer">
      <h1 className="headline">{call.text}</h1>
      <MachineLine call={call} />

      <section className="grid">
        {refunded > 0 && (
          <div className="grid-stamp">
            <span className="stamp">Refunded</span>
          </div>
        )}
        {bill.lines.map((l) => (
          <div key={l.label} className={`row ${refundedLabels.has(l.label) ? 'struck' : ''}`}>
            <span>{cap(l.label.replace(/^about /, ''))}</span>
            <span className="num">{fmt(l.tkn)}</span>
          </div>
        ))}
        <div className="row total">
          <span>Charged</span>
          <span className="num">{fmt(bill.total)}</span>
        </div>
        {refunded > 0 && (
          <div className="row total">
            <span>Refunded</span>
            <span className="num">{fmt(refunded)}</span>
          </div>
        )}
        <p className="machine">
          {fmt(bill.total)} tkn · ${fmt(usd(bill.total), 4)}
          {a.known.length ? ` · ${call.words} words written${capped ? ', billed at the posted price' : ''}` : ''} · energy {fmt(fp.wh, 2)} Wh · water {fmt(fp.ml, 1)} mL · carbon {fmt(fp.g, 3)} g
        </p>
        {call.flagged && <p className="machine">flagged for review{call.receipt ? ` · decision receipt ${call.receipt.n}` : ''}</p>}
      </section>

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
            <p key={i} className="ruled-line">
              {c}
            </p>
          ))}
        </section>
      )}

      {routed && first && (
        <section className="handles">
          <h2 className="kicker">Who handles this</h2>
          <div className="sheet slip">
            <p className="slip-desk">{first.name}</p>
            <p className="slip-what">{first.what}</p>
            <dl className="slip-lines">
              <dt>Ask</dt>
              <dd>{first.ask}</dd>
              <dt>Bring</dt>
              <dd>{first.bring}</dd>
              <dt>Cost</dt>
              <dd>{first.cost}</dd>
            </dl>
            {first.url && (
              <a href={first.url} rel="noreferrer" target="_blank">
                {first.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            )}
            <span className="stamp sheet-stamp">Routed</span>
          </div>
          {rest.map((d) => (
            <p key={d.name} className="also">
              <strong>{d.name}.</strong> {d.what} Cost {d.cost.toLowerCase()}. Bring {d.bring.toLowerCase()}.
            </p>
          ))}
          {a.ask_someone && <p className="also">{a.ask_someone}</p>}
        </section>
      )}

      {a.question_back && (
        <section className="question">
          <h2 className="kicker ruled">{a.question_back.text}</h2>
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
