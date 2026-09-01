# Roadmap — Jaybi

## Versions livrées

### v0.1 — Fondation frontend
- ✅ React 19 + TypeScript + Vite + Tailwind CSS
- ✅ Composants UI : ProductCard, CartDrawer, ShoppingRoadmap, AdminDashboard
- ✅ Données mock (mockData.ts)
- ✅ i18n (5 langues : FR, EN, ES, ZH, AR)
- ✅ Devise DH, formatage prix
- ✅ SavingsScore
- ✅ Géolocalisation
- ✅ Hardening sécurité frontend
- ✅ Seeds et tests frontend initiaux

### v0.1.1 — Finalisation frontend
- ✅ i18n complet (5 langues)
- ✅ Devise et formatage
- ✅ SavingsScore
- ✅ Géolocalisation
- ✅ Cohérence produits nationaux

### v0.2 — Backend + persistance
- ✅ Express + TypeScript
- ✅ Prisma 5.22 + PostgreSQL 16
- ✅ Auth JWT + OTP email
- ✅ 12 modules API (auth, products, orders, packs, promo, users, stores, brands, reports, suggestions, audit, config)
- ✅ Docker Compose (db + api + web)
- ✅ Seed depuis mockData.ts
- ✅ Tests backend (jwt, otp, middleware, intégration)

### v0.2.1 — Connexion frontend → backend
- ✅ Client API typé (lib/api.ts)
- ✅ JWT dans localStorage
- ✅ Fallback mock si backend indisponible
- ✅ Restauration de session au montage

### v0.2.2 — Rôle contributor
- ✅ Modèle ProductSuggestion
- ✅ Contributor : suggestions produits (pending admin)
- ✅ Contributor : signalements prix
- ✅ Admin : validation/rejet suggestions
- ✅ UI rabattable (sidebar, profile)

### v0.2.3 — Refonte responsive
- ✅ Viewport mobile + safe-area
- ✅ Sidebar admin overlay mobile
- ✅ Modales plein-écran mobile
- ✅ Touch targets 44px
- ✅ Recherche mobile
- ✅ Visuel cartes (animations, micro-interactions)

### v0.2.4 — Hardening sécurité
- ✅ DEV_BYPASS défaut false, impossible en prod
- ✅ JWT_SECRET obligatoire en prod
- ✅ Helmet (security headers)
- ✅ Rate limiting (global + auth)
- ✅ OTP exige entrée préalable (même dev)
- ✅ Password requis pour comptes existants
- ✅ Promo validation server-side complète (dates, minOrder, cap 100%, transaction)
- ✅ Error handler sans leak en prod

### v0.2.5 — Admin CRUD → API + fixes métier
- ✅ Tous les modules admin branchés à l'API
- ✅ fetchMyOrders au montage
- ✅ Signalements prix → API
- ✅ OrderSummaryModal : livraison incluse dans le total
- ✅ getCartItemPrice unifié (store + city)

### v0.2.6 — Rattrapage tests + CI
- ✅ 31 tests CRUD backend (8 modules)
- ✅ 11 tests API client frontend
- ✅ CI GitHub Actions (frontend + backend avec PostgreSQL)

### v0.2.7 — Fixes métier backend
- ✅ Remise pack appliquée côté backend
- ✅ suggestedData validé (anti XSS, schéma strict)
- ✅ JWT DB lookup (rôle en base, anti-escalade)
- ✅ SavingsScore persisté en base

### v0.2.8 — Fixes métier frontend
- ✅ Sélecteur 5 langues (FR, EN, ES, ZH, AR)
- ✅ Social login désactivé (badge "Bientôt")
- ✅ Géolocalisation roadmap : tri par distance (haversine)

### v0.2.9 — Gestion produits complète
- ✅ Soft delete uniquement (jamais de suppression physique)
- ✅ Restauration de produits supprimés
- ✅ Activation/désactivation
- ✅ Remise générale (discountPercent)
- ✅ Flash vente programmable (percent, dates, label)
- ✅ Liste admin : tous / supprimés / actifs
- ✅ ProductCard : prix remisé, badge Flash
- ✅ 18 tests gestion produits

**Total v0.2.x : 147 tests (70 frontend + 77 backend)**

---

## Versions à venir

### v0.3 — Scraping hybride + Sync Center admin
**Statut : à démarrer**

Architecture :
- Adaptateurs par enseigne (Marjane, Carrefour, BIM, Aswak Assalam)
- Classe abstraite BaseAdapter (fetch, parse, retry, backoff, timeout)
- Normalisation : mapping vers Product/PriceEntry/Store
- Matching produit : brand + name + weight
- Respect robots.txt + rate limiting 1 req/2s
- Scheduling : cron configurable (défaut quotidien 6h)
- Manual trigger depuis l'admin
- Dry-run / preview avant publication
- Approval flow : admin review → publish
- Sync history en base (SyncRun par adapter)
- Import CSV/Excel manuel (fallback si scraping bloqué)
- Sync Center UI : dashboard, trigger, preview, approval, history, config

Tests :
- Fixtures HTML/JSON par enseigne
- Tests parsing, normalisation, matching
- Tests retry/backoff/partial failure
- Tests approval flow

### v0.4 — E2E Playwright
**Statut : planifié**

- playwright.config.ts (chromium + firefox, viewport mobile)
- Flows consommateur : browse → search → cart → roadmap → order
- Flows admin : login → dashboard → CRUD produit → flash sale → restore
- Flows contributor : suggestion → report
- Matrice de permissions (tous les rôles)
- Viewport mobile (375px, 768px)
- Intégration CI

### v0.5 — Commandes hybride + abonnements
**Statut : planifié**

- Onglet Commandes admin + `PATCH /orders/:id/status`
- Paiement CMI (en ligne)
- Gestion abonnements/packs (vrais paiements)
- Webhooks paiement
- Notifications email (statut commande)
- JWT refresh tokens + blocklist Redis
- MFA optionnel (SMS/app)

### v0.6+ — Application mobile
**Statut : futur**

- API déjà mobile-compatible (REST + JWT)
- React Native ou Flutter
- Notifications push
- Géolocalisation native
- Mode hors-ligne

---

## Métriques par version

| Version | Tests | Modules API | Composants | Migration DB |
|---------|-------|-------------|------------|--------------|
| v0.1 | 59 (FE) | 0 | 15 | 0 |
| v0.2 | 87 (59+28) | 12 | 20 | 3 |
| v0.2.6 | 129 (70+59) | 12 | 22 | 4 |
| v0.2.9 | 147 (70+77) | 12 | 24 | 5 |
| v0.3 | +20 (estimé) | +2 (scraping) | +3 (Sync Center) | +2 |
| v0.4 | +15 E2E | — | — | — |
| v0.5 | +10 | +2 (payments) | +5 | +3 |
