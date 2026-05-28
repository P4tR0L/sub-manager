import { randomUUID } from 'node:crypto';
import { mutateDb, readDb } from './db';
import { CURRENCIES, type Currency, type Person, type Subscription } from '../types';

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export interface PersonInput {
  name: string;
}

export interface SubscriptionInput {
  name: string;
  monthlyAmount: number;
  currency: Currency;
  memberIds: string[];
}

// --- People ---

export async function listPeople(): Promise<Person[]> {
  const db = await readDb();
  return db.people;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const name = normalizeName(input.name);
  return mutateDb((db) => {
    const person: Person = { id: randomUUID(), name };
    db.people.push(person);
    return person;
  });
}

export async function updatePerson(id: string, input: PersonInput): Promise<Person> {
  const name = normalizeName(input.name);
  return mutateDb((db) => {
    const person = db.people.find((p) => p.id === id);
    if (!person) throw new NotFoundError('Nie znaleziono osoby.');
    person.name = name;
    return person;
  });
}

export async function deletePerson(id: string): Promise<void> {
  return mutateDb((db) => {
    const exists = db.people.some((p) => p.id === id);
    if (!exists) throw new NotFoundError('Nie znaleziono osoby.');
    db.people = db.people.filter((p) => p.id !== id);
    // Remove references in subscriptions; delete subscriptions that end up with no members.
    db.subscriptions = db.subscriptions
      .map((s) => ({ ...s, memberIds: s.memberIds.filter((m) => m !== id) }))
      .filter((s) => s.memberIds.length > 0);
  });
}

export async function reorderPeople(orderedIds: unknown): Promise<Person[]> {
  return mutateDb((db) => {
    if (!Array.isArray(orderedIds)) {
      throw new ValidationError('Nieprawidłowa lista kolejności.');
    }
    const ids = orderedIds.map(String);
    const byId = new Map(db.people.map((p) => [p.id, p]));
    const sameSize = ids.length === db.people.length;
    const allKnown = ids.every((id) => byId.has(id));
    const noDuplicates = new Set(ids).size === ids.length;
    if (!sameSize || !allKnown || !noDuplicates) {
      throw new ValidationError('Lista kolejności nie pasuje do istniejących osób.');
    }
    db.people = ids.map((id) => byId.get(id)!);
    return db.people;
  });
}

// --- Subscriptions ---

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await readDb();
  // Default currency to PLN for older records without a currency field.
  return db.subscriptions.map((s) => ({ ...s, currency: s.currency ?? 'PLN' }));
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const name = normalizeName(input.name);
  const monthlyAmount = normalizeAmount(input.monthlyAmount);
  const currency = normalizeCurrency(input.currency);
  return mutateDb((db) => {
    const memberIds = validateMembers(input.memberIds, db.people.map((p) => p.id));
    const subscription: Subscription = {
      id: randomUUID(),
      name,
      monthlyAmount,
      currency,
      memberIds,
    };
    db.subscriptions.push(subscription);
    return subscription;
  });
}

export async function updateSubscription(
  id: string,
  input: SubscriptionInput,
): Promise<Subscription> {
  const name = normalizeName(input.name);
  const monthlyAmount = normalizeAmount(input.monthlyAmount);
  const currency = normalizeCurrency(input.currency);
  return mutateDb((db) => {
    const subscription = db.subscriptions.find((s) => s.id === id);
    if (!subscription) throw new NotFoundError('Nie znaleziono subskrypcji.');
    subscription.memberIds = validateMembers(input.memberIds, db.people.map((p) => p.id));
    subscription.name = name;
    subscription.monthlyAmount = monthlyAmount;
    subscription.currency = currency;
    return subscription;
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  return mutateDb((db) => {
    const exists = db.subscriptions.some((s) => s.id === id);
    if (!exists) throw new NotFoundError('Nie znaleziono subskrypcji.');
    db.subscriptions = db.subscriptions.filter((s) => s.id !== id);
  });
}

// --- Validation ---

function normalizeName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError('Nazwa jest wymagana.');
  }
  return value.trim();
}

function normalizeCurrency(value: unknown): Currency {
  if (value == null) return 'PLN';
  if (typeof value !== 'string' || !CURRENCIES.includes(value as Currency)) {
    throw new ValidationError('Nieobsługiwana waluta.');
  }
  return value as Currency;
}

function normalizeAmount(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ValidationError('Kwota musi być liczbą większą od zera.');
  }
  return Math.round(num * 100) / 100;
}

function validateMembers(memberIds: unknown, validIds: string[]): string[] {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new ValidationError('Wybierz przynajmniej jedną osobę.');
  }
  const unique = Array.from(new Set(memberIds.map(String)));
  for (const id of unique) {
    if (!validIds.includes(id)) {
      throw new ValidationError('Wybrano nieistniejącą osobę.');
    }
  }
  return unique;
}
