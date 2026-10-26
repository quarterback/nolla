import { ALLOWANCE, COUNTER_WEEK_MAX, usd } from '../shared/desk';
import { callNumber, fmt, type Store } from './store';

export function Register({ store, model, onOpen, onReset }: { store: Store; model: string; onOpen: (id: string) => void; onReset: () => void }) {
  const spent = store.calls.reduce((n, c) => n + (c.charged?.total ?? 40), 0);
  const refunded = store.calls.reduce((n, c) => n + c.refunds.reduce((m, r) => m + r.amount, 0), 0);
  return (
    <section className="register">
      <h1 className="headline">Register</h1>
      <p className="machine">week of {store.week.slice(0, 10)} · model {model}</p>
      <p className="giant">{fmt(store.balance)}</p>
      <p className="giant-sub">tkn left of {fmt(ALLOWANCE)} · ${fmt(usd(store.balance), 3)} at the house rate</p>
      <div className="grid">
        <div className="row">
          <span>Spent this week</span>
          <span className="num">{fmt(spent)}</span>
        </div>
        <div className="row">
          <span>Refunded</span>
          <span className="num">{fmt(refunded)}</span>
        </div>
        <div className="row">
          <span>Counter refunds</span>
          <span className="num">{fmt(store.counterWeek)} of {fmt(COUNTER_WEEK_MAX)}</span>
        </div>
      </div>
      <h2 className="kicker ruled">Calls</h2>
      {store.calls.length === 0 && <p className="lede-s">No calls yet.</p>}
      <div className="calls">
        {[...store.calls].reverse().map((c) => (
          <button key={c.id} className="call-row" onClick={() => c.answer && onOpen(c.id)} disabled={!c.answer}>
            <span className="n">{callNumber(c.n)}</span>
            <span className="t">{c.text}</span>
            <span className="num">{c.charged ? `${fmt(c.charged.total)} tkn` : 'sorted only'}</span>
            <span className="s">{c.receipt ? `receipt ${c.receipt.n}` : c.flagged ? 'flagged' : c.sort.category}</span>
          </button>
        ))}
      </div>
      <button className="quiet" onClick={onReset}>
        Reset the week
      </button>
    </section>
  );
}
