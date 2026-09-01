# Guide de développement — Jaybi

## Prérequis

| Outil | Version | Rôle |
|-------|---------|------|
| Node.js | 20+ | Runtime JS (frontend + backend) |
| npm | 10+ | Gestionnaire de paquets |
| Docker | 24+ | PostgreSQL + déploiement |
| Git | 2.40+ | Versionnement |

## Installation (première fois)

### 1. Cloner le repo
```bash
git clone https://github.com/kasilyas/jaybi.git
cd jaybi
```

### 2. Frontend
```bash
npm install
cp .env.example .env.local
# Éditer .env.local :
#   VITE_API_URL=http://localhost:4000/api
#   VITE_DEV_BYPASS=true  (dev only)
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
# Éditer .env :
#   DATABASE_URL=postgresql://jaybi:jaybi@localhost:5433/jaybi?schema=public
#   JWT_SECRET=votre-secret-256-bits-minimum
#   DEV_BYPASS=true  (dev only)
#   CORS_ORIGIN=http://localhost:3000
```

### 4. Base de données (Docker)
```bash
# Depuis la racine du projet
docker compose up -d db

# Vérifier que PostgreSQL est prêt
docker compose ps db  # Status: healthy

# Migrations + seed
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 5. Démarrer le développement
```bash
# Terminal 1 : Backend
cd backend && npm run dev  # http://localhost:4000

# Terminal 2 : Frontend
npm run dev  # http://localhost:3000
```

## Variables d'environnement

### Frontend (`.env.local`)
| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `http://localhost:4000/api` | URL de l'API backend |
| `VITE_DEV_BYPASS` | `true` | Bypass OTP en dev (code fixe 123456) |
| `VITE_GEMINI_API_KEY` | — | Clé API Google Gemini (smart search) |

### Backend (`.env`)
| Variable | Défaut | Description |
|----------|--------|-------------|
| `DATABASE_URL` | — | **Obligatoire**. URL PostgreSQL |
| `JWT_SECRET` | — | **Obligatoire en prod**. Secret JWT 256+ bits |
| `JWT_EXPIRES_IN` | `7d` | Durée de validité des tokens |
| `DEV_BYPASS` | `true` (dev) / `false` (prod) | Bypass OTP + dev-login |
| `CORS_ORIGIN` | `http://localhost:3000` | Origine autorisée pour CORS |
| `NODE_ENV` | `development` | `production` = sécurité maximale |
| `SMTP_HOST` | — | Serveur SMTP (prod, envoi OTP) |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_USER` | — | Utilisateur SMTP |
| `SMTP_PASS` | — | Mot de passe SMTP |
| `SMTP_FROM` | `Jaybi <no-reply@jaybi.ma>` | Expéditeur OTP |

### Règles de sécurité
- `DEV_BYPASS=true` est **impossible** quand `NODE_ENV=production`
- `JWT_SECRET` **throw** si manquant en production (pas de fallback)
- `DEV_BYPASS` désactive les endpoints `/auth/test-accounts` et `/auth/dev-login`

## Comptes de test

| Rôle | Email | Tier | Accès |
|------|-------|------|-------|
| Admin | `admin@qayess.io` | unlimited | Console admin complète |
| Customer premium | `premium@qayess.ma` | pack2 | Fonctionnalités premium |
| Customer | `user@qayess.ma` | free | Parcours gratuit |
| Contributor | `tech@qayess.ma` | pack1 | Signalements + suggestions |

**Dev bypass** : code OTP fixe `123456` pour tous les comptes.
**Dev-login** : `POST /api/auth/dev-login { email }` — connexion sans OTP.

## Commandes de développement

### Frontend (racine)
```bash
npm run dev          # Serveur Vite (hot reload)
npm run build        # Build production (dist/)
npm run preview      # Prévisualiser le build
npm run typecheck    # tsc --noEmit
npm test             # Vitest (watch mode)
npx vitest run       # Vitest (one-shot)
```

### Backend (`backend/`)
```bash
npm run dev          # tsx watch (hot reload)
npm run build        # tsc → dist/
npm run start        # node dist/index.js
npm run typecheck    # tsc --noEmit
npm test             # Vitest (one-shot)
npx prisma migrate dev    # Créer + appliquer migration
npx prisma migrate deploy # Appliquer migrations existantes (CI/prod)
npx prisma db seed         # Seed depuis mockData.ts
npx prisma studio          # Interface DB visuelle
npx prisma generate        # Régénérer le client Prisma
```

### Docker
```bash
docker compose up -d              # Tout (db + api + web)
docker compose up -d db           # DB seulement
docker compose logs -f api        # Logs backend
docker compose down               # Arrêter
docker compose down -v            # Arrêter + supprimer volumes
```

## Conventions de code

### TypeScript
- `strict: true` dans tsconfig
- Pas de `any` sauf justification (sérialiseurs)
- Types partagés dans `types.ts` (frontend) et `schema.prisma` (backend)

### Style
- Tailwind CSS uniquement (pas de CSS custom sauf utilitaires dans `index.css`)
- Composants : PascalCase (`ProductCard.tsx`)
- Fonctions : camelCase
- Constantes : UPPER_SNAKE_CASE

### Commits
Format : `vX.Y.Z: description courte`
```bash
git commit -m "v0.3.0: scraping hybride (adaptateurs + import CSV + Sync Center)"
```

### Règles métier
- **Soft delete uniquement** : jamais de `prisma.xxx.delete()` — toujours `isDeleted: true`
- **Validation Zod** sur toutes les routes d'écriture
- **Audit log** pour chaque action admin
- **JWT DB lookup** : le middleware vérifie le rôle en base (pas dans le token seul)

## Workflow de développement (test-first)

Chaque nouveau module ou modification suit ce cycle :

1. **Écrire le test** (unitaire ou intégration) qui décrit le comportement attendu
2. **Vérifier qu'il échoue** (rouge)
3. **Implémenter la fonctionnalité**
4. **Vérifier que le test passe** (vert)
5. **Lancer TOUS les tests** pour vérifier l'absence de régression
6. **Typecheck** (`npx tsc --noEmit`)
7. **Build** (`npm run build`)
8. **Commit** avec message descriptif

```bash
# Cycle complet
cd backend && npx vitest run && npx tsc --noEmit
cd .. && npx vitest run && npx tsc --noEmit && npm run build
```

## Structure des tests

### Frontend (`tests/`)
| Fichier | Tests | Couverture |
|---------|-------|------------|
| `auth.test.ts` | 6 | Logique auth frontend |
| `cart.test.ts` | 12 | Panier, quantités, sous-total |
| `format.test.ts` | 8 | Formatage prix/devise |
| `i18n.test.ts` | 6 | Traductions (5 langues) |
| `promo.test.ts` | 11 | Validation codes promo |
| `seeds.test.ts` | 16 | Cohérence données seed |
| `api.test.ts` | 11 | Client API (fetch, JWT, erreurs) |
| **Total** | **70** | |

### Backend (`backend/tests/`)
| Fichier | Tests | Couverture |
|---------|-------|------------|
| `jwt.test.ts` | 3 | Sign/verify JWT |
| `otp.test.ts` | 4 | Génération OTP (dev/prod) |
| `auth.middleware.test.ts` | 6 | Middleware auth + requireRole |
| `integration/auth.routes.test.ts` | 9 | Routes auth (OTP, me, test-accounts) |
| `integration/contributor.test.ts` | 6 | Rôle contributor (suggestions, reports) |
| `integration/crud.test.ts` | 31 | 8 modules (users, orders, packs, promo, stores, brands, audit, config) |
| `integration/products.management.test.ts` | 18 | Gestion produits (CRUD, soft delete, flash sale, activation) |
| **Total** | **77** | |

### CI GitHub Actions
- **Job frontend** : typecheck → vitest → build
- **Job backend** : PostgreSQL service → prisma migrate → seed → typecheck → vitest
- Trigger : push et PR sur `master`/`main`
