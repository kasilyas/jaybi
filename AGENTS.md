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

## Sécurité — état v0.1
- ✅ S1 corrigé : plus d'escalade admin par mot-clé email.
- ✅ S2 corrigé : plus d'auto-login admin au chargement.
- ✅ S3 corrigé : bypass 2FA gated par `DEV_BYPASS`.
- ⏳ S4 (vérif mot de passe), S5 (JWT/session), S6 (authz serveur) → **v0.2 backend**.

## Incohérences données — état v0.1
- ✅ Corrigé : D1 (FK orders), D4 (soft-delete stores/promo), D5 (seeds promo/reports/audit),
  D6 (snapshot prix commande), D11 (dates ISO), D13 (adresses seed).
- ⏳ Reporté : D2 (IDs produits → UUID en v0.2), D3 (concept "National" à modéliser en BD),
  D7 (savingsScore métier), D8 (devise), D9 (i18n chaînes hardcodées dans composants),
  D10 (simulateDataSync → wiring v0.3), D12 (paiement CMI → v0.5), D14 (géoloc → v0.3).

## Roadmap
- v0.2 — Backend Express/TS + Prisma + PostgreSQL + Auth JWT + Docker
- v0.3 — Service scraping + Sync Center admin
- v0.4 — E2E Playwright
- v0.5 — Commandes hybride COD + abonnements/packs
