import { TOUR, type TourState } from './tour';

/** The front page: what the desk is, and a tour of every state. */
export function Front({ onStart, onTour }: { onStart: () => void; onTour: (key: TourState) => void }) {
  return (
    <section className="front">
      <h1 className="display">A reference desk with a price list.</h1>
      <p className="lede">The desk sorts each call, posts the price before any work runs, routes to the people and places that handle the call, and refunds line by line.</p>
      <button className="primary wide" onClick={onStart}>
        Start a call
      </button>
      <h2 className="kicker ruled">The tour</h2>
      <ul className="tour">
        {TOUR.map((t) => (
          <li key={t.key}>
            <button onClick={() => onTour(t.key)}>
              <span className="t-name">{t.name}</span>
              <span className="t-what">{t.what}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
