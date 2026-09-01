# Stratégie de tests — Jaybi

## Philosophie

> Les tests doivent être intégrés dans le développement : à chaque développement d'un module ou changement d'une fonctionnalité, il faut faire les tests et vérifier s'il y a régression.

Chaque modification de code doit :
1. Inclure un test pour le nouveau comportement
2. Passer tous les tests existants (anti-régression)
3. Passer le typecheck
4. Passer le build

## Pyramide de tests

```
         ┌───────────┐
         │   E2E     │  ← v0.4 (Playwright) — flows utilisateur complets
         │ (à venir) │
         └─────┬─────┘
         ┌─────┴─────┐
         │ Intégration│  ← Supertest + DB réelle — routes API + Prisma
         └─────┬─────┘
         ┌─────┴─────┐
         │  Unitaires │  ← Vitest — logique pure, mocks pour dépendances
         └───────────┘
```

## Tests unitaires

### Frontend (Vitest)
- **cart.test.ts** : ajout/incrément/suppression items, quantités, sous-total
- **promo.test.ts** : validation codes (actif, expiré, minOrder, maxUses)
- **format.test.ts** : formatage prix, devise, suffixes
- **i18n.test.ts** : cohérence traductions sur 5 langues
- **auth.test.ts** : logique auth frontend
- **seeds.test.ts** : cohérence données seed (produits, prix, packs)
- **api.test.ts** : client API (fetch mocké, JWT, gestion erreurs, endpoints)

### Backend (Vitest)
- **jwt.test.ts** : signature et vérification de tokens
- **otp.test.ts** : génération OTP (mode dev `123456`, mode prod aléatoire)
- **auth.middleware.test.ts** : authenticate (token valide/invalide/missing), requireRole (autorisation par rôle)

### Conventions
- Mocks pour les dépendances externes (fetch, prisma, jwt)
- Pas de DB réelle pour les unitaires
- Tests rapides (< 100ms par test)

## Tests d'intégration

### Backend (Vitest + Supertest + PostgreSQL)

**Principe** : l'app Express complète est montée, les requêtes HTTP sont envoyées via Supertest, la DB PostgreSQL réelle est utilisée.

**Isolation** :
- `NODE_ENV=test` (rate limiting désactivé)
- `DEV_BYPASS=true` (OTP bypass pour login facile)
- Helper `login(email)` : request-otp → verify-otp → token
- Chaque test de création nettoie après lui (DELETE)
- `describe.runIf(dbAvailable)` : skip si DB indisponible

### Couverture par module

| Module | Fichier | Tests | Scénarios |
|--------|---------|-------|-----------|
| Auth | `auth.routes.test.ts` | 9 | OTP request/verify, me, test-accounts, products 401/403 |
| Contributor | `contributor.test.ts` | 6 | Suggestions CRUD, reports, permissions |
| Users | `crud.test.ts` | 4 | List (admin 200, customer 403), PUT, DELETE |
| Orders | `crud.test.ts` | 5 | Create (201), /me, all (admin), by id (owner/non-owner 403) |
| Packs | `crud.test.ts` | 5 | GET, POST admin/customer 403, PUT, DELETE |
| Promo | `crud.test.ts` | 4 | GET, POST admin/customer 403, DELETE |
| Stores | `crud.test.ts` | 4 | GET, POST admin/customer 403, DELETE |
| Brands | `crud.test.ts` | 4 | GET, POST admin/customer 403, DELETE |
| Audit | `crud.test.ts` | 2 | GET admin 200, customer 403 |
| Config | `crud.test.ts` | 3 | GET, PUT admin/customer 403 |
| Products | `products.management.test.ts` | 18 | CRUD, soft delete, restore, activate, flash sale, validation, permissions |

### Tests croisés (cross-cutting)

Les tests d'intégration couvrent aussi les aspects transverses :

- **Permissions** : chaque endpoint admin est testé avec customer (403) et sans token (401)
- **Anti-escalade** : nouveau user = `customer`/`free`, pas d'auto-admin
- **Soft delete** : vérification que le produit existe toujours en base
- **Validation** : Zod rejette les entrées invalides (discount > 100%, champs manquants)
- **Ownership** : un customer ne peut voir que ses propres commandes
- **JWT DB lookup** : le rôle est lu en base, pas dans le token

## Tests E2E (v0.4 — Playwright)

### À venir
- **playwright.config.ts** : navigateurs chromium + firefox, viewport mobile
- **Flows consommateur** : browse → search → product details → cart → roadmap → order
- **Flows admin** : login → dashboard → CRUD produit → flash sale → restore
- **Flows contributor** : login → suggestion produit → report prix
- **Multi-rôles** : matrice de permissions
- **Viewport mobile** : 375px (iPhone), 768px (iPad)

## CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

**Job frontend** (ubuntu-latest) :
1. Checkout
2. Node.js 20
3. `npm ci`
4. `npx tsc --noEmit` — typecheck
5. `npx vitest run` — 70 tests
6. `npm run build` — build production

**Job backend** (ubuntu-latest + PostgreSQL 16) :
1. Checkout
2. Node.js 20
3. Service PostgreSQL (Docker)
4. `npm ci` (backend)
5. `npx prisma migrate deploy` — migrations
6. `npx prisma db seed` — seed
7. `npx tsc --noEmit` — typecheck
8. `npx vitest run` — 77 tests

**Trigger** : push et PR sur `master`/`main`

### Ajouter un test à la CI
1. Créer le fichier `.test.ts` dans `tests/` (frontend) ou `backend/tests/` (backend)
2. Le fichier est automatiquement détecté par Vitest (`include: ['tests/**/*.test.ts']`)
3. La CI le exécutera au prochain push

## Commandes de test

```bash
# Frontend
npm test                    # Watch mode
npx vitest run              # One-shot (70 tests)
npx vitest run tests/cart   # Un fichier spécifique
npx vitest run --reporter=verbose  # Sortie détaillée

# Backend
cd backend && npm test      # One-shot (77 tests)
npx vitest run tests/integration/products  # Un module spécifique

# Tout d'un coup (avant commit)
cd backend && npx vitest run && npx tsc --noEmit && cd .. && npx vitest run && npx tsc --noEmit && npm run build
```

## Métriques actuelles

| Métrique | Valeur |
|----------|--------|
| Tests frontend | 70 |
| Tests backend | 77 |
| **Total** | **147** |
| Fichiers de test | 14 |
| Couverture modules backend | 12/12 (100%) |
| Couverture routes admin | Toutes testées (401/403/200/201/204) |
| CI | GitHub Actions (2 jobs) |
| E2E | À venir (v0.4) |
