# Raketarstvo – natjecanja (NestJS + Supabase + Angular)

Web aplikacija za organizaciju natjecanja u raketarstvu s admin panelom, sučevim unosom rezultata i uživo prikazom.

## Stack

| Sloj | Tehnologija |
|------|-------------|
| Frontend | Angular 19 |
| Backend | NestJS |
| Baza + Realtime | Supabase (PostgreSQL) |
| Auth | JWT (NestJS) |

## Struktura projekta

```
test/
├── backend/          # NestJS REST API
├── frontend/         # Angular SPA
└── supabase/
    └── migrations/   # SQL shema
```

## Postavljanje Supabase

1. Kreirajte projekt na [supabase.com](https://supabase.com)
2. U **SQL Editor** pokrenite sadržaj datoteke `supabase/migrations/001_initial_schema.sql`
3. U **Project Settings → API** kopirajte:
   - Project URL
   - `anon` key (frontend + RLS)
   - `service_role` key (backend – tajno!)

## Konfiguracija

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=long-random-secret
JWT_EXPIRES_IN=7d
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

### Frontend (`frontend/src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseAnonKey: 'your-anon-key',
};
```

## Pokretanje

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (novi terminal)
cd frontend
npm install
npm start
```

Frontend: http://localhost:4200  
API: http://localhost:3000/api

## Default admin

Nakon migracije:

- **Email:** `admin@raketarstvo.hr`
- **Lozinka:** `admin123`

Promijenite lozinku prije produkcije.

## Funkcionalnosti

### Javna stranica
- Nadolazeća i aktivna natjecanja
- Detalji natjecanja s timovima
- **Uživo rezultati** (Supabase Realtime na tablici `launches`)
- Povijest završenih natjecanja

### Admin (`/admin`)
- CRUD klubova, natjecatelja, sudaca, natjecanja
- Kreiranje timova (2–3 natjecatelja + 1 sudac)
- Validacija: sudac ne smije biti iz istog kluba kao natjecatelji
- Validacija: natjecatelj može biti samo u **jednom** timu po natjecanju
- Sudac može suditi **više timova** (i na istom natjecanju)

### Sudac (`/sudac`)
- Prijava emailom/lozinkom (kreira admin)
- Stoperica: Start / Stop / 0 (neuspjeh) / Spremi
- Kategorije: **traka** (max 180 s), **padobran** (max 300 s)
- 2 ili 3 ispaljivanja po kategoriji (određuje admin)

## API rute (sažetak)

| Metoda | Ruta | Pristup |
|--------|------|---------|
| POST | `/api/auth/login` | Javno |
| GET | `/api/competitions` | Javno |
| GET | `/api/competitions/:id` | Javno |
| GET | `/api/launches/competition/:id` | Javno |
| CRUD | `/api/clubs`, `/competitors`, `/judges`, `/competitions`, `/teams` | Admin |
| GET | `/api/teams/my-teams` | Sudac |
| POST | `/api/launches` | Sudac / Admin |

## Realtime

Frontend se pretplaćuje na promjene u tablici `launches` filtrirane po `competition_id`. Kad sudac spremi rezultat, stranica natjecanja se automatski ažurira.
