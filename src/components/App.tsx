import { useCallback, useEffect, useState } from 'react';
import type { Person, Rates, Subscription } from '../types';
import { peopleApi, ratesApi, subscriptionsApi } from '../lib/api';
import { PeopleManager } from './PeopleManager';
import { SubscriptionForm } from './SubscriptionForm';
import { SubscriptionCard } from './SubscriptionCard';
import { Summary } from './Summary';

export function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [canLogout, setCanLogout] = useState(false);

  useEffect(() => {
    setCanLogout(document.cookie.includes('session='));
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [p, s] = await Promise.all([peopleApi.list(), subscriptionsApi.list()]);
      setPeople(p);
      setSubscriptions(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd wczytywania danych.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRates = useCallback(async () => {
    try {
      setRates(await ratesApi.get());
      setRatesError(null);
    } catch (err) {
      setRates(null);
      setRatesError(err instanceof Error ? err.message : 'Brak kursów walut.');
    }
  }, []);

  useEffect(() => {
    void reload();
    void loadRates();
  }, [reload, loadRates]);

  const upsertSubscription = useCallback((saved: Subscription) => {
    setSubscriptions((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  }, []);

  const removeSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reorderPeople = useCallback(async (orderedIds: string[]) => {
    setError(null);
    setPeople((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return orderedIds.map((id) => byId.get(id)).filter((p): p is Person => Boolean(p));
    });
    try {
      await peopleApi.reorder(orderedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zmienić kolejności.');
      await reload();
    }
  }, [reload]);

  if (loading) {
    return <p className="muted">Wczytywanie...</p>;
  }

  return (
    <div className="layout">
      {canLogout && (
        <div className="app-toolbar">
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="ghost sm">
              Wyloguj
            </button>
          </form>
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      {rates?.stale && (
        <div className="notice">
          Kursy walut mogą być nieaktualne (brak połączenia z NBP) — użyto ostatnich zapisanych.
        </div>
      )}
      {ratesError && (
        <div className="notice">
          {ratesError} Kwoty w USD/EUR pokazane bez przeliczenia na PLN.
        </div>
      )}

      <div className="grid">
        <section className="panel">
          <h2>Subskrypcje</h2>
          <SubscriptionForm
            people={people}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              upsertSubscription(saved);
            }}
          />

          {subscriptions.length === 0 ? (
            <p className="muted">Brak subskrypcji. Dodaj pierwszą powyżej.</p>
          ) : (
            <div className="cards">
              {[...subscriptions]
                .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
                .map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  people={people}
                  rates={rates}
                  onEdit={() => setEditing(sub)}
                  onDeleted={removeSubscription}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="sidebar">
          <Summary
            people={people}
            subscriptions={subscriptions}
            rates={rates}
            onReorder={reorderPeople}
          />
          <PeopleManager people={people} subscriptions={subscriptions} onChanged={reload} />
        </aside>
      </div>
    </div>
  );
}
