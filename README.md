# Menedżer subskrypcji

Aplikacja webowa do zarządzania subskrypcjami i dzielenia ich kosztów między osoby. Zbudowana w Astro + React + TypeScript. Dane przechowywane jako JSON — lokalnie w pliku, na produkcji w Netlify Blobs.

## Funkcje

- Dodawanie, edycja i usuwanie osób.
- Dodawanie, edycja i usuwanie subskrypcji (nazwa, kwota miesięczna, waluta, uczestnicy wybierani checkboxami).
- Zapis subskrypcji wymaga wybrania minimum 1 osoby.
- Obsługa walut PLN, USD i EUR. Kwoty w USD/EUR są przeliczane na PLN wg aktualnych kursów NBP (z cache na wypadek braku internetu). W widoku pokazywana jest kwota oryginalna oraz w nawiasie równowartość w PLN, np. `12,99 EUR (55,02 zł)`.
- Karta subskrypcji pokazuje kwotę miesięczną oraz kwotę przypadającą na każdą osobę (równy podział, zaokrąglony do 2 miejsc / groszy).
- Podsumowanie łącznej kwoty miesięcznej per osoba w PLN (ze wszystkich subskrypcji, po przeliczeniu walut), z rozwijanym rozbiciem na poszczególne subskrypcje, oraz sumy wszystkich subskrypcji.
- Drag & drop zmiany kolejności osób na liście podsumowania.
- Ochrona hasłem (produkcja i opcjonalnie lokalnie).

## Wymagania

- Node.js 18+ (testowane na Node 22).
- Netlify CLI (opcjonalnie, do `dev:netlify` i seedowania Blobs).

## Instalacja

```bash
npm install
cp .env.example .env
```

Uzupełnij `.env` wartościami `APP_PASSWORD` i `APP_SESSION_SECRET` (losowy string ≥32 znaki), jeśli chcesz testować logowanie lokalnie. Bez tych zmiennych aplikacja działa bez auth (wygodne dla dev).

## Uruchomienie lokalne

```bash
npm run dev
```

Aplikacja będzie dostępna pod `http://localhost:4321`. Dane zapisywane są w `data/db.json` (pliki lokalne).

### Lokalnie z Netlify Blobs

```bash
npm run dev:netlify
```

Uruchamia Astro przez Netlify CLI — ustawia `NETLIFY=true` i używa Blobs zamiast plików.

## Deploy (Netlify)

### Magazyn danych

| Środowisko | Backend | Źródło prawdy |
|------------|---------|---------------|
| Lokalny dev (`npm run dev`) | pliki `data/*.json` | `data/db.json` |
| Netlify (`NETLIFY=true`) | Netlify Blobs (store `sub-manager`) | blob `db` |

Plik `data/db.json` w repozytorium służy jako seed dev i źródło do jednorazowej migracji — **nie** jest bazą produkcyjną. Plik jest **lokalny** (pomijany w gicie, jak `data/rates.json`).

### Zmienne środowiskowe (Netlify UI)

| Zmienna | Opis |
|---------|------|
| `APP_PASSWORD` | Wspólne hasło dostępu do aplikacji |
| `APP_SESSION_SECRET` | Losowy string (≥32 znaki) do podpisywania cookie sesji |

Blobs nie wymagają dodatkowych kluczy API — działają automatycznie w kontekście deployu Netlify.

### Kroki deploy

1. Push repo na GitHub/GitLab/Bitbucket.
2. Netlify → **Add new site** → Import from Git.
3. Build command: `npm run build` (Node 22 — ustawione w `netlify.toml`).
4. Ustaw env vars: `APP_PASSWORD`, `APP_SESSION_SECRET`.
5. Deploy.
6. Jednorazowo zaseeduj Blobs danymi z `data/db.json`:

   ```bash
   netlify link          # jeśli jeszcze nie połączone
   netlify dev           # lub kontekst produkcyjny CLI
   npm run seed:blobs
   ```

7. Wejdź na URL → zaloguj się → sprawdź CRUD osób/subskrypcji i kursy NBP.

### Weryfikacja po deployu

- [ ] Niezalogowany użytkownik jest przekierowany na `/login`
- [ ] Niezalogowany dostaje `401` na `/api/people`, `/api/subscriptions`, `/api/rates`
- [ ] Logowanie poprawnym hasłem ustawia sesję (30 dni)
- [ ] Wylogowanie czyści cookie
- [ ] CRUD osób i subskrypcji działa po zalogowaniu
- [ ] Drag & drop reorder osób działa
- [ ] `/api/rates` pobiera kursy NBP; offline używa cache z Blobs
- [ ] Redeploy **nie kasuje** danych (zapis w Blobs)

## Dane

- Lokalnie cała baza to plik `data/db.json`, tworzony automatycznie przy pierwszym uruchomieniu (plik jest pomijany w gicie).
- Struktura:

```json
{
  "people": [{ "id": "...", "name": "Anna" }],
  "subscriptions": [
    { "id": "...", "name": "Netflix", "monthlyAmount": 43.0, "currency": "PLN", "memberIds": ["..."] }
  ]
}
```

- Plik można bezpiecznie podejrzeć lub edytować ręcznie (przy zatrzymanym serwerze). Aby wyczyścić dane lokalnie, usuń `data/db.json` lub ustaw go na `{ "people": [], "subscriptions": [] }`.
- `data/rates.json` to cache ostatnio pobranych kursów NBP (regenerowalny, pomijany w gicie). Starsze subskrypcje bez pola `currency` są traktowane jako PLN.

## Struktura projektu

```
src/
  components/        Komponenty React (App, formularze, karty, podsumowanie)
  lib/               Klient API (api.ts) i obliczenia/format PLN (money.ts)
  pages/
    index.astro      Strona główna
    login.astro      Strona logowania
    api/             Endpointy REST (people, subscriptions, auth)
  server/            Warstwa danych: storage, db, repo, rates, auth
  middleware.ts      Ochrona hasłem
  styles/global.css  Style
  types.ts           Wspólne typy
scripts/
  seed-blobs.ts      Jednorazowa migracja data/db.json → Netlify Blobs
data/db.json         Lokalna baza dev (gitignore) / seed do migracji Blobs
netlify.toml         Konfiguracja Netlify
```

## Uwagi techniczne

- Kwota per osoba to `kwota_miesieczna / liczba_osob` zaokrąglona do 2 miejsc. Przy nierównym podziale suma udziałów może minimalnie różnić się od kwoty całkowitej (przyjęty prosty podział).
- Usunięcie osoby usuwa ją z uczestników subskrypcji; jeśli subskrypcja zostanie bez żadnej osoby, zostaje skasowana.
- Kursy walut pobierane są z publicznego API NBP (tabela A, kurs średni `mid`): `https://api.nbp.pl/api/exchangerates/rates/A/{USD|EUR}`. Kurs pobierany jest najwyżej raz dziennie — jeśli cache pochodzi z dzisiejszej daty, jest używany bez odpytywania NBP. Przy braku internetu używany jest ostatni zapisany kurs (oznaczony jako nieaktualny w UI), a kolejne próby pobrania są wstrzymywane na 10 minut. Gdy nie ma ani połączenia, ani cache, kwoty walutowe pokazywane są bez przeliczenia.
- Sesja logowania wygasa po 30 dniach. Cookie jest podpisane HMAC (`APP_SESSION_SECRET`).
