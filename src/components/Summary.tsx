import { useState } from 'react';
import type { Currency, Person, Rates, Subscription } from '../types';
import { convertToPLN, formatMoney, round2, splitPerPerson } from '../lib/money';

interface Props {
  people: Person[];
  subscriptions: Subscription[];
  rates: Rates | null;
  onReorder: (orderedIds: string[]) => void;
}

interface Share {
  subscriptionId: string;
  name: string;
  original: number;
  currency: Currency;
  pln: number | null;
}

export function Summary({ people, subscriptions, rates, onReorder }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const summaries = people.map((person) => {
    const shares: Share[] = subscriptions
      .filter((s) => s.memberIds.includes(person.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      .map((s) => {
        const original = splitPerPerson(s.monthlyAmount, s.memberIds.length);
        return {
          subscriptionId: s.id,
          name: s.name,
          original,
          currency: s.currency,
          pln: convertToPLN(original, s.currency, rates),
        };
      });
    const total = round2(shares.reduce((sum, share) => sum + (share.pln ?? 0), 0));
    return { person, shares, total };
  });

  const grandTotal = round2(
    subscriptions.reduce(
      (sum, s) => sum + (convertToPLN(s.monthlyAmount, s.currency, rates) ?? 0),
      0,
    ),
  );

  function ShareAmount({ share }: { share: Share }) {
    if (share.currency === 'PLN') return <span>{formatMoney(share.original, 'PLN')}</span>;
    const base = formatMoney(share.original, share.currency);
    const primary = share.pln !== null ? formatMoney(share.pln, 'PLN') : base;
    return (
      <span className="amount-display">
        <span>{primary}</span>
        {share.pln !== null && <span className="amount-converted">{base}</span>}
      </span>
    );
  }

  function toggle(personId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function handleDrop(targetId: string) {
    if (dragId && dragId !== targetId) {
      const ids = people.map((p) => p.id);
      const dragIndex = ids.indexOf(dragId);
      const targetIndex = ids.indexOf(targetId);
      const order = ids.filter((id) => id !== dragId);
      const newTargetIndex = order.indexOf(targetId);
      const insertAt = dragIndex < targetIndex ? newTargetIndex + 1 : newTargetIndex;
      order.splice(insertAt, 0, dragId);
      onReorder(order);
    }
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="panel">
      <h2>Podsumowanie / miesiąc</h2>
      {people.length === 0 ? (
        <p className="muted">Brak danych do podsumowania.</p>
      ) : (
        <>
          <ul className="list">
            {summaries.map(({ person, shares, total }) => {
              const isOpen = expanded.has(person.id);
              const classes = [
                'summary-item',
                dragId === person.id ? 'dragging' : '',
                dragOverId === person.id && dragId !== person.id ? 'drag-over' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <li
                  key={person.id}
                  className={classes}
                  draggable
                  onDragStart={(e) => {
                    setDragId(person.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverId(person.id);
                  }}
                  onDrop={() => handleDrop(person.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                >
                  <div className="summary-row-wrap">
                    <span className="drag-handle" aria-hidden="true" title="Przeciągnij, aby zmienić kolejność">
                      {'\u2630'}
                    </span>
                    <button
                      type="button"
                      className="summary-row"
                      onClick={() => toggle(person.id)}
                      aria-expanded={isOpen}
                      disabled={shares.length === 0}
                    >
                      <span className="summary-name">
                        <span className={`chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
                          {shares.length === 0 ? '' : '\u203A'}
                        </span>
                        {person.name}
                      </span>
                      <strong>{formatMoney(total, 'PLN')}</strong>
                    </button>
                  </div>

                  {isOpen && shares.length > 0 && (
                    <ul className="breakdown">
                      {shares.map((share) => (
                        <li key={share.subscriptionId}>
                          <span>{share.name}</span>
                          <span className="per-person"><ShareAmount share={share} /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="grand-total">
            <span>Suma wszystkich subskrypcji</span>
            <strong>{formatMoney(grandTotal, 'PLN')}</strong>
          </div>
        </>
      )}
    </div>
  );
}
