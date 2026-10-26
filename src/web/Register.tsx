import { ALLOWANCE, COUNTER_WEEK_MAX } from '../shared/desk';
import { callNumber, fmt, tkn, type Store, type Theme } from './store';

const THEMES: { key: Theme; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function Register({ store, model, onOpen, onReset, onTheme }: { store: Store; model: string; onOpen: (id: string) => void; onReset: () => void; onTheme: (t: Theme | undefined) => void }) {
  const spent = store.calls.reduce((n, c) => n + (c.charged?.total ?? 40), 0);
  const refunded = store.calls.reduce((n, c) => n + c.refunds.reduce((m, r) => m + r.amount, 0), 0);
  return (
    <section className="register">
      <h1 className="headline">Register</h1>
      <p className="machine">week of {store.week.slice(0, 10)} · model {model}</p>
      <p className="giant">{tkn(store.balance)}</p>
      <p className="giant-sub">of {tkn(ALLOWANCE)} this week</p>
      <div className="grid">
        <div className="row">
          <span>Spent this week</span>
          <span className="num">{tkn(spent)}</span>
        </div>
        <div className="row">
          <span>Refunded</span>
          <span className="num">{tkn(refunded)}</span>
        </div>
        <div className="row">
          <span>Counter refunds</span>
          <span className="num">{fmt(store.counterWeek)} of {tkn(COUNTER_WEEK_MAX)}</span>
        </div>
      </div>
      <h2 className="kicker ruled">Look</h2>
      <div className="themes">
        {THEMES.map((t) => (
          <button key={t.key} className={`theme ${store.theme === t.key ? 'on' : ''}`} onClick={() => onTheme(t.key)} aria-pressed={store.theme === t.key}>
            {t.label}
          </button>
        ))}
        <button className={`theme ${!store.theme ? 'on' : ''}`} onClick={() => onTheme(undefined)} aria-pressed={!store.theme}>
          Follow the system
        </button>
      </div>
      <h2 className="kicker ruled">Calls</h2>
      {store.calls.length === 0 && <p className="lede-s">No calls yet.</p>}
      <div className="calls">
        {[...store.calls].reverse().map((c) => (
          <button key={c.id} className="call-row" onClick={() => c.answer && onOpen(c.id)} disabled={!c.answer}>
            <span className="n">{callNumber(c.n)}</span>
            <span className="t">{c.text}</span>
            <span className="num">{c.charged ? tkn(c.charged.total) : 'sorted only'}</span>
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
