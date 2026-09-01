# Architecture — Jaybi

## Vue d'ensemble

Jaybi est une plateforme de comparaison de prix grande surface au Maroc. L'architecture est un monolithique à deux couches : frontend React + backend Express, partageant une base PostgreSQL.

```
┌─────────────────────────────────────────────────┐
│                   Navigateur                     │
│  React 19 + TypeScript + Vite + Tailwind CSS    │
│  lib/api.ts → client HTTP typé (JWT + fetch)    │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / REST API
┌──────────────────────▼──────────────────────────┐
│              Backend Express + TS               │
│  12 modules routes (auth, products, orders, ...) │
│  Middleware : JWT + DB lookup + requireRole      │
│  Prisma 5.22 → ORM typé                          │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│            PostgreSQL 16 (Docker)               │
│  15 modèles : User, Product, PriceEntry, Order,  │
│  Pack, PromoCode, Store, Brand, AuditLog, ...    │
└─────────────────────────────────────────────────┘
```

## Structure des dossiers

```
jaybi/
├── App.tsx                        # État global frontend
├── types.ts                       # Types TypeScript partagés (frontend)
├── constants.tsx                  # i18n (5 langues), icônes, config UI
├── config.ts                      # Configuration runtime frontend
├── index.html / index.tsx         # Points d'entrée
├── index.css                      # Tailwind + utilitaires responsive
│
├── components/                    # Composants UI React
│   ├── AuthModal.tsx              # Connexion OTP + dev-login
│   ├── ProductCard.tsx            # Carte produit (prix remisé, flash sale)
│   ├── ProductBrowserModule.tsx   # Navigation produits (pagination)
│   ├── ProductDetailsModal.tsx    # Fiche produit (prix multi-enseignes)
│   ├── PackBrowserModule.tsx      # Navigation packs
│   ├── PackDetailsModal.tsx       # Détail pack (remise calculée)
│   ├── CartDrawer.tsx             # Panier (remise pack, promo)
│   ├── ShoppingRoadmap.tsx        # Mode GPS (tri par distance)
│   ├── OrderSummaryModal.tsx      # Récap commande (livraison incluse)
│   ├── OrderDetailsModal.tsx      # Détail commande
│   ├── ComparisonModal.tsx        # Comparateur multi-enseignes
│   ├── UserProfileModule.tsx      # Profil + historique commandes
│   ├── SubscriptionModal.tsx      # Abonnement premium
│   ├── AdminDashboard.tsx         # Console admin (sync API)
│   ├── AdminProductModule.tsx     # CRUD produits + flash sale + corbeille
│   ├── AdminPackModule.tsx        # CRUD packs
│   ├── AdminUserModule.tsx        # CRM utilisateurs
│   ├── AdminStoreModule.tsx       # CRUD enseignes
│   ├── AdminBrandModule.tsx       # CRUD marques
│   ├── AdminPromoModule.tsx       # CRUD codes promo
│   ├── AdminReportsModule.tsx     # Modération signalements
│   ├── AdminSubscriptionModule.tsx # Config abonnements
│   └── AdminAuditModule.tsx       # Audit log
│
├── lib/                           # Logique métier frontend
│   ├── api.ts                     # Client API (fetch + JWT, 25+ fonctions)
│   ├── cart.ts                    # Gestion panier (getCartItemPrice unifié)
│   ├── promo.ts                   # Validation codes promo
│   ├── auth.ts                    # Helpers auth frontend
│   └── format.ts                  # Formatage prix/devise
│
├── data/mockData.ts               # Données seed (source unique frontend + backend)
├── services/geminiService.ts      # Intégration Gemini (parsing, suggestions)
├── tests/                         # Tests frontend (Vitest, 70 tests)
│
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express app (helmet, rate limit, CORS, routes)
│   │   ├── config/
│   │   │   ├── env.ts             # Config env (DEV_BYPASS, JWT_SECRET, ...)
│   │   │   └── testAccounts.ts    # Comptes test (dev only)
│   │   ├── routes/                # 12 modules API
│   │   │   ├── auth.routes.ts     # OTP, dev-login, me, test-accounts
│   │   │   ├── products.routes.ts # CRUD + admin/all + deleted + restore + activate
│   │   │   ├── orders.routes.ts   # Create + list + detail (ownership)
│   │   │   ├── packs.routes.ts    # CRUD packs
│   │   │   ├── promo.routes.ts    # CRUD codes promo
│   │   │   ├── users.routes.ts    # CRUD users (admin)
│   │   │   ├── stores.routes.ts   # CRUD enseignes
│   │   │   ├── brands.routes.ts   # CRUD marques
│   │   │   ├── reports.routes.ts  # Signalements prix
│   │   │   ├── suggestions.routes.ts # Suggestions produits (contributor)
│   │   │   ├── audit.routes.ts    # Audit log (admin)
│   │   │   └── config.routes.ts   # Config plateforme
│   │   ├── middleware/auth.ts     # JWT + DB lookup + requireRole
│   │   ├── lib/
│   │   │   ├── prisma.ts          # Client Prisma singleton
│   │   │   ├── jwt.ts             # Sign/verify JWT
│   │   │   ├── otp.ts             # Génération + envoi OTP
│   │   │   ├── audit.ts           # Audit log en base
│   │   │   └── serialize.ts       # Sérialiseurs (Product, Order, User, ...)
│   │   └── scraping/              # (v0.3 — à venir)
│   ├── prisma/
│   │   ├── schema.prisma          # 15 modèles + enums
│   │   ├── seed.ts                # Seed depuis mockData.ts
│   │   └── migrations/            # Migrations versionnées
│   ├── tests/                     # Tests backend (77 tests)
│   │   ├── jwt.test.ts            # Unitaires JWT
│   │   ├── otp.test.ts            # Unitaires OTP
│   │   ├── auth.middleware.test.ts # Unitaires middleware
│   │   └── integration/           # Intégration DB (supertest)
│   │       ├── auth.routes.test.ts
│   │       ├── contributor.test.ts
│   │       ├── crud.test.ts       # 8 modules (users, orders, packs, ...)
│   │       └── products.management.test.ts # 18 tests gestion produits
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml             # db (5433) + api (4000) + web (3000)
├── Dockerfile                     # Frontend production build
├── .github/workflows/ci.yml       # CI GitHub Actions
├── AGENTS.md                      # Instructions pour agents IA
└── README.md                      # Documentation principale
```

## Modèles de données (Prisma)

### User
- `id`, `name`, `email` (unique), `passwordHash` (optional)
- `role` : `customer` | `contributor` | `admin`
- `tier` : `free` | `pack1` | `pack2` | `unlimited`
- `isPremium`, `isDeleted` (soft delete), `savingsScore`
- Relations : `addresses`, `orders`, `reports`, `auditLogs`

### Product
- `id`, `name`, `brandId`, `category`, `image`, `unit`, `weight`
- `isNational` (produit marocain), `isDeleted` (soft delete), `isActive`
- **Remise** : `discountPercent` (0-100)
- **Flash vente** : `flashSalePercent`, `flashSaleStartsAt`, `flashSaleEndsAt`, `flashSaleLabel`
- Relations : `prices` (PriceEntry[]), `packs`, `reports`

### PriceEntry
- `id`, `productId`, `storeId`, `city`, `price`, `originalPrice` (optional)
- `promotionExpiresAt`, `available`, `lastUpdated`

### Order
- `id`, `userId`, `total`, `discountAmount`, `deliveryFee`
- `mode` : `delivery` | `roadmap`
- `paymentMethod` : `cod` | `cmi`
- `status` : `pending` | `confirmed` | `delivered` | `cancelled`
- `promoCodeId`, `promoCodeUsed`
- Relations : `items` (OrderItem[])

### OrderItem
- `id`, `orderId`, `productId`, `productName` (snapshot)
- `storeName` (snapshot), `city`, `quantity`, `unitPrice` (snapshot), `packId`

### Pack
- `id`, `name`, `description`, `image`, `price`, `originalPrice`
- `discountPercent`, `theme`, `isDeleted`
- Relations : `products` (PackProduct[])

### PromoCode
- `id`, `code` (unique), `discountType` (`percent` | `fixed`)
- `discountValue`, `maxUses`, `currentUses`
- `startsAt`, `expiresAt`, `minOrderAmount`
- `isActive`, `isDeleted`

### Autres modèles
- `Store` : enseignes (Marjane, Carrefour, BIM, Aswak Assalam)
- `Brand` : marques (Ariel, Pampers, ...)
- `ProductSuggestion` : suggestions de produits (contributor → admin)
- `PriceReport` : signalements prix (crowdsourcing)
- `AuditLog` : traçabilité (action, user, details, type)
- `Address` : adresses de livraison
- `PlatformConfig` : config globale (tiers, maintenance)

## Flux de données

### Authentification
```
Utilisateur → email → POST /auth/request-otp
  → (dev: code 123456) / (prod: envoi email SMTP)
  → POST /auth/verify-otp { email, code }
  → JWT signé (7 jours) + user sérialisé
  → Token stocké dans localStorage côté frontend
  → Chaque requête : Authorization: Bearer <token>
  → Middleware : verifyToken + DB lookup (rôle actuel, non supprimé)
```

### Commande (COD)
```
Panier → POST /orders { items, mode, paymentMethod }
  → Snapshot prix unitaires (avec remise pack si applicable)
  → Validation promo (dates, minOrder, cap 100%, transaction atomique)
  → Calcul total + deliveryFee (20 DH si delivery)
  → Order créée en base + items
  → SavingsScore incrémenté si prix promo
  → Audit log
```

### Gestion produit (admin)
```
Admin → POST/PUT/DELETE /products
  → Validation Zod (champs, discount 0-100, flash sale dates)
  → Soft delete uniquement (isDeleted=true, isActive=false)
  → Restaurable via POST /:id/restore
  → Activable/désactivable via PATCH /:id/activate|deactivate
  → Flash sale : programmable (startsAt, endsAt), actif calculé automatiquement
  → Audit log pour chaque action
```

## Décisions architecturales

| Décision | Choix | Raison |
|----------|-------|--------|
| Monolithe vs microservices | Monolithe | MVP, équipe réduite, déploiement simple |
| ORM | Prisma | Typé, migrations versionnées, DX excellente |
| Auth | JWT + OTP email | Pas de mot de passe obligatoire, 2FA par OTP |
| State management | State lifting (App.tsx) | MVP, pas besoin de Redux/Zustand |
| Tests | Vitest + Supertest | Rapide, même config que le build |
| CI | GitHub Actions | Intégré à GitHub, gratuit pour repos publics |
| Déploiement | Docker Compose | Reproductible, un seul fichier |
| Soft delete | isDeleted sur toutes les entités | Préserve l'intégrité référentielle |
| Dev bypass | DEV_BYPASS gated sur NODE_ENV | Sécurité prod sans friction dev |
