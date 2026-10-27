import { callNumber, type Call } from './store';

/** The sort path, as the model filed the call. */
export function Classification({ call }: { call: Call }) {
  const s = call.sort;
  return (
    <ol className="path">
      {s.path.map((p, i) => (
        <li key={p} className={i === s.path.length - 1 ? 'last' : ''} style={{ paddingLeft: `${i * 16}px` }}>
          {p}
        </li>
      ))}
    </ol>
  );
}

/** The one line form, for pages after the question. */
export function MachineLine({ call, extra }: { call: Call; extra?: string }) {
  return (
    <p className="machine">
      call {callNumber(call.n)}
      {call.sort.path.length ? ` · ${call.sort.path.join(', ')}` : ''}
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
