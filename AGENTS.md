# Jaybi — Guide projet (pour agents / devs)

## Commandes
- `npm run dev` — serveur Vite (port 3000)
- `npm run build` — build production
- `npm test` — Vitest (run unique)
- `npm run test:watch` — Vitest watch
- `npm run typecheck` — `tsc --noEmit`

## Environnement
- Copier `.env.example` en `.env.local`.
- `VITE_DEV_BYPASS=true` active : bypass 2FA (code `123456`), affichage du code OTP,
  et liste d'auto-connexion de test dans AuthModal. **Jamais en production.**
- `VITE_GEMINI_API_KEY` — clé Gemini côté client (MVP). Sera déplacée vers le backend en v0.2.

## Architecture (v0.1 — frontend durci)
- État global dans `App.tsx`, logique métier extraite dans `lib/` (testable) :
  - `lib/cart.ts` — panier (add/update/remove/subtotal/snapshot)
  - `lib/promo.ts` — validation & calcul codes promo
  - `lib/auth.ts` — règle d'attribution des rôles (anti-escalade)
- `config.ts` — gate du mode dev (`DEV_BYPASS`, `TEST_ACCOUNTS`).
- Tests dans `tests/` (Vitest + jsdom).

## Sécurité — état v0.2
- ✅ S1 corrigé : plus d'escalade admin par mot-clé email.
- ✅ S2 corrigé : plus d'auto-login admin au chargement.
- ✅ S3 corrigé : bypass 2FA gated par `DEV_BYPASS`.
- ✅ S4 corrigé : vérif mot de passe côté serveur (bcrypt) avant OTP.
- ✅ S5 corrigé : auth JWT (sign/verify) côté backend.
- ✅ S6 corrigé : autorisation serveur par rôle (`requireRole('admin')`).
- ✅ S7 corrigé : OTP généré côté serveur, bypass gated par `DEV_BYPASS`.
- ✅ S8 corrigé : rôles/tiers attribuables uniquement par un admin authentifié.
- ⏳ S9 : déplacer la clé Gemini derrière le backend (prochaine étape).
- ⏳ S10 : rate limiting (middleware Express, à ajouter).

## Incohérences données — état v0.2
- ✅ Corrigé : D1 (FK orders), D2 (IDs → cuid via Prisma), D3 (cohérence isNational),
  D4 (soft-delete stores/promo), D5 (seeds promo/reports/audit), D6 (snapshot prix commande),
  D7 (savingsScore = économies réelles), D8 (helper devise formatPrice + suffixe i18n),
  D9 (chaînes AuthModal + prix i18n), D11 (dates ISO), D13 (adresses seed), D14 (géoloc).
- ⏳ Reporté : D10 (simulateDataSync → module scraping v0.3), D12 (paiement CMI → v0.5).
- 📌 Décision produit : la console admin reste FR-only pour le MVP (outil interne).
  Le front-office client est full i18n (FR/EN/ES/ZH/AR).

## Backend (v0.2) — `backend/`
- Stack : Express + TypeScript + Prisma + PostgreSQL.
- Commandes (depuis `backend/`) :
  - `npm run dev` — serveur API (port 4000, hot-reload via tsx watch)
  - `npm run build` — compilation TS -> `dist/`
  - `npm run prisma:migrate` — crée/applique les migrations
  - `npm run seed` — charge les seeds (depuis `data/mockData.ts`, source unique)
  - `npm test` — Vitest (unitaires + intégration si DB dispo)
  - `npm run typecheck` — `tsc --noEmit`
- Schéma Prisma : `backend/prisma/schema.prisma` (toutes entités + relations + soft-delete).
- Migration init : `backend/prisma/migrations/20260828132207_init/`.
- Routes API (`/api`) : auth, products, users, orders, packs, promo, stores, brands, reports, audit, config.
- Auth : JWT + OTP email. `DEV_BYPASS=true` → code fixe `123456` + auto-login test.
- Tests backend : 22 tests (otp, jwt, middleware auth, intégration auth routes).

## Connexion frontend -> backend (v0.2.1)
- `lib/api.ts` : client API typé (fetch) pour tous les endpoints backend.
- `App.tsx` : au montage, tente de charger les données depuis l'API. Si l'API
  n'est pas joignable, retombe sur `mockData` (fallback transparent).
- `AuthModal.tsx` : auth via backend (request-otp + verify-otp + dev-login).
  Fallback local si l'API est indisponible.
- JWT stocké dans `localStorage` (`jaybi_jwt`), envoyé en header `Authorization`.
- `finalizeOrder` : crée la commande via `POST /api/orders` si l'API est dispo.
- `VITE_API_URL` : URL du backend (défaut `http://localhost:4000/api`).
- `tsconfig.json` racine : exclut `backend/` du typecheck frontend.

## Docker (v0.2)
- `docker compose up -d db` — PostgreSQL (port hôte 5433).
- `docker compose run --rm seed` — migrations + seed (one-shot).
- `docker compose up -d api web` — API (port 4000) + front (port 3000).
- Volumes : `jaybi-db-data` pour la persistance PostgreSQL.

## Roadmap
- v0.3 — Service scraping + Sync Center admin
- v0.4 — E2E Playwright
- v0.5 — Commandes hybride COD + abonnements/packs + CMI
