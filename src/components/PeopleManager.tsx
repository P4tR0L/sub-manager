import { useState } from 'react';
import type { Person, Subscription } from '../types';
import { peopleApi } from '../lib/api';

interface Props {
  people: Person[];
  subscriptions: Subscription[];
  onChanged: () => Promise<void> | void;
}

export function PeopleManager({ people, subscriptions, onChanged }: Props) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    await run(async () => {
      await peopleApi.create(name);
      setName('');
    });
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    await run(async () => {
      await peopleApi.update(id, editName);
      setEditingId(null);
    });
  }

  function subsCount(personId: string): number {
    return subscriptions.filter((s) => s.memberIds.includes(personId)).length;
  }

  async function handleDelete(person: Person) {
    const count = subsCount(person.id);
    const note =
      count > 0
        ? `\n\nOsoba uczestniczy w ${count} subskrypcji(ach). Zostanie z nich usunięta, a subskrypcje bez osób zostaną skasowane.`
        : '';
    if (!confirm(`Usunąć osobę "${person.name}"?${note}`)) return;
    await run(() => peopleApi.remove(person.id));
  }

  return (
    <div className="panel">
      <h2>Osoby</h2>

      <form className="row" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Imię osoby"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          Dodaj
        </button>
      </form>

      {error && <div className="alert">{error}</div>}

      {people.length === 0 ? (
        <p className="muted">Brak osób. Dodaj kogoś, aby tworzyć subskrypcje.</p>
      ) : (
        <ul className="list" style={{ marginTop: '1rem' }}>
          {people.map((person) => (
            <li key={person.id} className="list-item">
              {editingId === person.id ? (
                <div className="row">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={busy}
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(person.id)} disabled={busy}>
                    Zapisz
                  </button>
                  <button className="ghost" onClick={() => setEditingId(null)} disabled={busy}>
                    Anuluj
                  </button>
                </div>
              ) : (
                <>
                  <span className="person-name">{person.name}</span>
                  <span className="person-right">
                    <span className="badge">{subsCount(person.id)} sub.</span>
                    <span className="actions">
                      <button
                        className="ghost sm"
                        onClick={() => {
                          setEditingId(person.id);
                          setEditName(person.name);
                        }}
                        disabled={busy}
                      >
                        Edytuj
                      </button>
                      <button className="danger sm" onClick={() => handleDelete(person)} disabled={busy}>
                        Usuń
                      </button>
                    </span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
