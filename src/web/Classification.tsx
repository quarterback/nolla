import { callNumber, type Call } from './store';

/** The desk's classification, large and set apart: the code with its out of
 * register copy behind it, and the path stepping down beneath. */
export function Classification({ call }: { call: Call }) {
  const s = call.sort;
  return (
    <div className="classification">
      <p className="code" data-copy={s.code}>
        {s.code}
      </p>
      <ol className="path">
        {s.path.map((p, i) => (
          <li key={p} className={i === s.path.length - 1 ? 'last' : ''} style={{ paddingLeft: `${i * 20}px` }}>
            {p}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The one line form of the same thing, for pages after the quote. */
export function MachineLine({ call, extra }: { call: Call; extra?: string }) {
  const s = call.sort;
  return (
    <p className="machine">
      call {callNumber(call.n)} · {s.code} · {s.path.slice(0, 3).join(', ')}
      {extra ? ` · ${extra}` : ''}
    </p>
  );
}

/** The call split into pieces, as the desk reads it. */
export function Pieces({ text, tail }: { text: string; tail?: string }) {
  const pieces = text.match(/\s?\S{1,4}/g) ?? [];
  if (!pieces.length) return null;
  return (
    <div className="pieces-wrap">
      <div className="pieces" aria-label="The call in pieces">
        {pieces.map((p, i) => (
          <span key={i} className="piece">
            {p.trim()}
          </span>
        ))}
      </div>
      <p className="machine">
        {pieces.length} pieces read{tail ? ` · ${tail}` : ''}
      </p>
    </div>
  );
}
