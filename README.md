# Jaybi — L'intelligence dans votre poche

Plateforme de comparaison de prix grande surface au Maroc. Permet aux consommateurs de trouver les meilleurs prix parmi Marjane, Carrefour, BIM et Aswak Assalam, de planifier leurs courses (roadmap GPS), et de passer commande en cash on delivery (COD).

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript, Prisma 5.22 |
| **Base de données** | PostgreSQL 16 |
| **Auth** | JWT + OTP email (bcrypt, dev bypass pour tests) |
| **IA** | Google Gemini (`@google/genai`) — parsing listes, suggestions |
| **Tests** | Vitest, Supertest (129 tests : 70 frontend + 59 backend) |
| **CI/CD** | GitHub Actions (typecheck + tests + build + PostgreSQL service) |
| **Docker** | Docker Compose (db + api + web) |

## Architecture

```
jaybi/
├── App.tsx                    # État global frontend, routing logique
├── components/                # Composants UI (ProductCard, CartDrawer, AdminDashboard, ...)
├── lib/                       # Logique métier (cart, promo, auth, format, api client)
│   └── api.ts                 # Client API typé (fetch + JWT)
├── data/mockData.ts           # Données seed (source unique pour frontend + backend)
├── services/geminiService.ts  # Intégration Gemini (parsing, suggestions)
├── tests/                     # Tests frontend (Vitest)
├── backend/
│   ├── src/
│   │   ├── routes/            # 12 modules API (auth, products, orders, packs, ...)
│   │   ├── middleware/auth.ts # Auth JWT + requireRole
│   │   ├── lib/               # prisma, jwt, otp, audit, serialize
│   │   └── config/            # env, testAccounts
│   ├── prisma/
│   │   ├── schema.prisma      # 15 modèles (User, Product, PriceEntry, Order, Pack, ...)
│   │   ├── seed.ts            # Seed depuis mockData.ts
│   │   └── migrations/        # Migrations Prisma
│   └── tests/                 # Tests backend (unitaires + intégration DB)
├── docker-compose.yml         # PostgreSQL + API + Web
├── .github/workflows/ci.yml   # CI GitHub Actions
└── Dockerfile                 # Frontend production build
```

## Démarrage rapide

### Prérequis
- Node.js 20+
- Docker (pour PostgreSQL)

### 1. Base de données (Docker)
```bash
docker compose up -d db
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # Configurer DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                    # http://localhost:4000
```

### 3. Frontend
```bash
cp .env.example .env.local     # Configurer VITE_API_URL, VITE_DEV_BYPASS
npm install
npm run dev                    # http://localhost:3000
```

### 4. Docker Compose (tout en un)
```bash
docker compose up -d           # db:5433, api:4000, web:3000
```

## Comptes de test (développement uniquement)

| Rôle | Email | Tier | Accès |
|------|-------|------|-------|
| Admin | `admin@qayess.io` | unlimited | Console admin complète |
| Customer premium | `premium@qayess.ma` | pack2 | Fonctionnalités premium |
| Customer | `user@qayess.ma` | free | Parcours gratuit |
| Contributor | `tech@qayess.ma` | pack1 | Signalements prix + suggestions produits |

**Dev bypass** : `DEV_BYPASS=true` → code OTP fixe `123456`, auto-login test.
Jamais activé en production (gated sur `NODE_ENV`).

## Rôles et permissions

| Rôle | Permissions |
|------|------------|
| **customer** | Recherche, comparaison, panier, commande COD, signalement prix |
| **contributor** | Tout customer + suggestions de produits (création/modif, pending admin) |
| **admin** | Tout + CRUD produits/packs/stores/brands/promo/users, modération signalements, config |

## Modules fonctionnels

### Front-office (consommateur)
- **Smart Search** : recherche prédictive (Gemini) + filtrage local
- **Magic Import** : coller une liste de courses, l'IA remplit le panier
- **Comparateur multi-enseignes** : meilleur prix parmi Marjane, Carrefour, BIM, Aswak Assalam
- **Shopping Roadmap** : mode GPS pour courses physiques, regroupement par magasin, signalements prix
- **Packs & Promos** : bundles avec remises, codes promo
- **Commande COD** : cash on delivery, frais de livraison 20 DH
- **i18n** : 5 langues (FR, EN, ES, ZH, AR) — FR/AR accessibles actuellement
- **Responsive mobile** : modales plein-écran, touch targets 44px, sidebar admin overlay

### Back-office (admin)
- **Dashboard** : KPIs temps réel (volume, conversion, produits populaires)
- **Catalogue produits** : CRUD complet + prix multi-enseignes/villes
- **CRM utilisateurs** : gestion rôles, tiers, soft-delete
- **Packs & Promos** : création bundles, codes promo avec dates/limites
- **Modération signalements** : validation/rejet des prix remontés
- **Suggestions produits** : validation/rejet des suggestions contributor
- **Audit log** : traçabilité complète (sync backend)
- **Config plateforme** : tiers d'abonnement, maintenance

## API endpoints

```
POST /api/auth/request-otp      POST /api/auth/verify-otp
GET  /api/auth/me               GET  /api/auth/test-accounts (dev)
POST /api/auth/dev-login        (dev)

GET/POST/PUT/DELETE /api/products
GET/POST/PUT/DELETE /api/packs
GET/POST/PUT/DELETE /api/stores
GET/POST/PUT/DELETE /api/brands
GET/POST/PUT/DELETE /api/promo
GET/PUT/DELETE      /api/users (admin)
GET/POST            /api/orders
GET                 /api/orders/me
GET                 /api/orders/:id
GET                 /api/orders (admin)
GET/POST            /api/reports
PATCH               /api/reports/:id/status (admin)
GET/POST            /api/suggestions
PATCH               /api/suggestions/:id/review (admin)
GET                 /api/audit (admin)
GET/PUT             /api/config
```

## Tests

```bash
# Frontend (70 tests)
npm test

# Backend (59 tests, nécessite PostgreSQL)
cd backend && npm test
```

### Couverture
- **Frontend** : cart, promo, auth, format, i18n, seeds, API client
- **Backend unitaires** : JWT, OTP, middleware auth
- **Backend intégration** : auth routes, contributor role, CRUD (users, orders, packs, promo, stores, brands, audit, config)

## Sécurité

- JWT + OTP email (bcrypt hashing)
- `DEV_BYPASS` impossible en production (gated sur `NODE_ENV`)
- `JWT_SECRET` obligatoire en production (throw si manquant)
- Helmet (security headers : HSTS, CSP, X-Frame-Options)
- Rate limiting : 100 req/15min global, 10 req/15min sur auth
- Validation Zod sur toutes les routes
- Anti-escalade : nouveau user = `customer`/`free`, rôles gérés par admin uniquement
- Promo : validation server-side (dates, minOrder, cap 100%, transaction atomique)
- Pas de SQL injection (Prisma paramétré)

## Roadmap

| Version | Statut | Contenu |
|---------|--------|---------|
| v0.1 | ✅ | Fondation frontend, hardening, seeds, tests |
| v0.1.1 | ✅ | i18n, devise, savingsScore, géoloc, cohérence National |
| v0.2 | ✅ | Backend Express/TS + Prisma + PostgreSQL + Auth JWT + Docker |
| v0.2.1 | ✅ | Connexion frontend → backend API |
| v0.2.2 | ✅ | Rôle contributor + UI rabattable |
| v0.2.3 | ✅ | Refonte responsive + UI mobile + visuel cartes |
| v0.2.4 | ✅ | Hardening sécurité (DEV_BYPASS, JWT, helmet, rate limiting, OTP, promo) |
| v0.2.5 | ✅ | Admin CRUD → API + fixes métier consommateur |
| v0.2.6 | ✅ | Rattrapage tests (31 CRUD + 11 API client) + CI GitHub Actions |
| v0.3 | 🔜 | Service scraping (adaptateurs Marjane/Carrefour/BIM/Aswak) + Sync Center admin |
| v0.4 | 🔜 | E2E Playwright |
| v0.5 | 🔜 | Commandes hybride COD + abonnements/packs + paiement CMI |

## Mentions légales

- Données soft-deleted (`isDeleted: true`) pour préserver l'intégrité référentielle
- Conforme CNDP Maroc / RGPD
- Pages légales accessibles via `LegalView`

---

Développé avec passion pour optimiser le quotidien.
