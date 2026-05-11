# Marketing Tasks

Správa marketingových úkolů s trackováním hodin.

- `/admin` — admin rozhraní (klienti, zaměstnanci, úkoly)
- `/app` — pohled zaměstnance (moje úkoly + hodiny)

## Lokální spuštění

### 1. Nainstaluj Node.js

Stáhni z [nodejs.org](https://nodejs.org) (LTS verzi) a nainstaluj.

### 2. Nastav databázi

Potřebuješ PostgreSQL. Nejsnazší možnosti:
- **Railway** (viz níže) — zdarma, doporučeno
- **Supabase** — zdarma tier
- **lokálně** — `brew install postgresql`

Zkopíruj `.env.example` do `.env.local` a vyplň `DATABASE_URL`:

```bash
cp .env.example .env.local
# pak otevři .env.local a vlož connection string
```

### 3. Spusť

```bash
npm install
npm run db:push   # vytvoří tabulky v databázi
npm run dev       # spustí na http://localhost:3000
```

---

## Deploy na Railway

1. Založ účet na [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo** → vyber tento repozitář
3. **Add Database → PostgreSQL** — Railway automaticky nastaví `DATABASE_URL`
4. V sekci **Variables** přidej build command: `npm run build`
5. V sekci **Settings → Start Command**: `npm start`
6. Deploy proběhne automaticky při každém push na GitHub

### Před prvním deployem spusť migraci

V Railway konzoli (nebo lokálně s Railway `DATABASE_URL`):
```bash
npm run db:push
```

---

## Funkce

- **Klienti** — správa databáze klientů, přiřazování k úkolům
- **Zaměstnanci** — seznam zaměstnanců, výběr bez loginu
- **Úkoly** — jednorázové (1×) a pravidelné (↺), stavy Todo/Probíhá/Splněno
- **Pravidelné úkoly** — po splnění je lze resetovat tlačítkem ↺ Reset
- **Trackování hodin** — každý zaměstnanec loguje hodiny k úkolu
- **Admin přehled** — statistiky, filtry podle klienta/zaměstnance/stavu/typu
