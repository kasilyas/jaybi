# Schéma technique — Système de scraping Jaybi

## Vue d'ensemble du flux

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN (Sync Center)                              │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Trigger  │  │ Dry-run  │  │ Preview  │  │ Approve  │  │ History  │ │
│  │ manuel   │  │ (simul.) │  │ changem. │  │ /reject  │  │ + erreurs│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘ │
│       │              │              │              │                     │
└───────┼──────────────┼──────────────┼──────────────┼─────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    SYNC SERVICE (orchestrateur)                        │
│                                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Scheduler   │  │  Queue de    │  │  Approval    │  │  Publish   │ │
│  │  (cron 6h)   │──│  jobs        │──│  gate        │──│  to DB     │ │
│  │  configurable│  │  (1/adapt.)  │  │  (dry-run)   │  │  (atomic)  │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    SYNC RUN (en base)                             │ │
│  │  id, adapter, status, startedAt, endedAt,                        │ │
│  │  productsFound, productsUpdated, errors[], triggeredBy           │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    ADAPTATEURS (1 par enseigne)                        │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  Marjane    │  │  Carrefour │  │  BIM       │  │  Aswak Assalam │  │
│  │  Adapter    │  │  Adapter   │  │  Adapter   │  │  Adapter       │  │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └───────┬────────┘  │
│         │               │               │                │            │
│  ┌──────┴───────────────┴───────────────┴────────────────┴────────┐  │
│  │              BASE ADAPTER (classe abstraite)                    │  │
│  │                                                                  │  │
│  │  • fetch(url) → HTML/API     • respect robots.txt               │  │
│  │  • parse(html) → ScrapedData  • rate limit 1 req / 2s          │  │
│  │  • retry 3x + backoff exp.   • timeout 30s / page              │  │
│  │  • pagination auto           • user-agent identifié            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              IMPORT CSV (fallback manuel)                        │ │
│  │  Admin upload fichier → parse → même pipeline que adaptateurs   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    NORMALIZER (pipeline de traitement)                 │
│                                                                        │
│  ScrapedProduct[]                                                      │
│       │                                                                │
│       ▼                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │
│  │  Nettoyage    │───▶│  Matching    │───▶│  Diff vs DB  │            │
│  │  (units, casse│    │  (brand+name │    │  (prix changé│            │
│  │   espaces)    │    │   +weight)   │    │   ? nouveau ?)│            │
│  └──────────────┘    └──────────────┘    └──────┬───────┘            │
│                                                   │                    │
│                                                   ▼                    │
│                                          ┌────────────────┐           │
│                                          │  SyncChanges   │           │
│                                          │  (preview)     │           │
│                                          │                │           │
│                                          │  • newProducts │           │
│                                          │  • priceChanges│           │
│                                          │  • promotions  │           │
│                                          │  • unavailable │           │
│                                          └────────┬───────┘           │
└───────────────────────────────────────────────────┼────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    APPROVAL GATE (admin review)                        │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Preview affiché à l'admin :                                    │   │
│  │                                                                  │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │   │
│  │  │ 12 nouveaux│ │ 47 prix    │ │ 3 promos   │ │ 8 indispo.   │ │   │
│  │  │  produits  │ │  modifiés  │ │  détectées │ │              │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │   │
│  │                                                                  │   │
│  │  [Tout approuver]  [Sélectionner]  [Rejeter]  [Voir détail]    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Si dry-run : pas d'écriture en base                                   │
│  Si approve : publish atomique (transaction)                           │
└───────────────────────────────────────────────────────────────────────┘
        │ (approve)
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    PUBLISH (écriture en base)                          │
│                                                                        │
│  prisma.$transaction([                                                 │
│    Product.upsert(...)      // nouveaux produits                       │
│    PriceEntry.upsert(...)   // prix mis à jour                         │
│    SyncRun.update(...)      // statut = completed                      │
│    AuditLog.create(...)     // traçabilité                            │
│  ])                                                                    │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Cycle de vie d'un Sync Run

```
┌─────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ PENDING │────▶│ RUNNING  │────▶│ DRY_RUN   │────▶│ APPROVED │────▶│COMPLETED │
│         │     │          │     │ (preview) │     │          │     │          │
└─────────┘     └────┬─────┘     └─────┬─────┘     └──────────┘     └──────────┘
                     │                 │
                     ▼                 ▼
                ┌──────────┐     ┌──────────┐
                │  FAILED  │     │ REJECTED │
                │ (erreur) │     │ (admin)  │
                └──────────┘     └──────────┘

États possibles : pending → running → dry_run → approved → completed
                                   → rejected
                          running → failed (retry 3x épuisé)
```

---

## Structure d'un ScrapedProduct (sortie d'adaptateur)

```
ScrapedProduct {
  source: "marjane"           // identifiant enseigne
  sourceUrl: "https://..."    // URL d'origine
  scrapedAt: Date             // timestamp du scrape

  // Données produit
  name: "Lait Centrale 1L"   // nom brut depuis le site
  brand: "Centrale"           // marque (si détectable)
  category: "Lait"            // catégorie (mapping)
  image: "https://..."        // image produit
  unit: "L"                   // unité (normalisée)
  weight: 1                   // poids (normalisé)

  // Données prix
  price: 7.5                   // prix actuel
  originalPrice: 8.5          // prix barré (si promo)
  promotionLabel: "Promo -10%"// label promo
  promotionExpiresAt: Date    // fin de promo (si détectable)
  available: true             // en stock ?

  // Localisation
  city: "Casablanca"          // ville
  storeName: "Marjane"        // nom enseigne
}
```

---

## Pipeline de normalisation (détail)

```
ScrapedProduct (brut)
    │
    ▼
┌─────────────────────────────────────────────┐
│ 1. NETTOYAGE                                 │
│                                              │
│  name = "LAIT  CENTRALE  1L " → "Lait Centrale 1L"  │
│  unit = "litre" → "L"                        │
│  unit = "kilo" → "kg"                        │
│  unit = "unité" → "unit"                     │
│  weight = "1L" → 1 (extraction numérique)   │
│  price = "7,50 DH" → 7.5 (parse float)      │
│  brand = "CENTRALE" → "Centrale" (Title)     │
│  espaces multiples → single space            │
│  accents normalisés                          │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│ 2. MATCHING (produit existant en base ?)     │
│                                              │
│  Stratégie de matching :                     │
│  a) brandId + name normalisé → match exact   │
│  b) name fuzzy (Levenshtein < 2) → match     │
│  c) brand + weight + unit → match probable   │
│  d) Sinon → nouveau produit                  │
│                                              │
│  Score de confiance : 0.0 à 1.0              │
│  • > 0.9 : match automatique                 │
│  • 0.6-0.9 : match à confirmer (admin)       │
│  • < 0.6 : nouveau produit                   │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│ 3. DIFF (changement vs base)                 │
│                                              │
│  Pour chaque produit matché :                │
│  • prix actuel vs prix scraped → priceChange │
│  • promo détectée → promotion                │
│  • disponible → indisponible → unavailability│
│                                              │
│  Pour les nouveaux :                         │
│  • newProduct (à créer)                      │
│                                              │
│  Output : SyncChanges {                      │
│    newProducts: ScrapedProduct[]             │
│    priceChanges: { productId, old, new }[]   │
│    promotions: { productId, label, ends }[]  │
│    unavailability: { productId, storeId }[]  │
│  }                                           │
└─────────────────────────────────────────────┘
```

---

## Adaptateur — cycle de vie détaillé

```
┌─────────────────────────────────────────────────────────────┐
│                    BASE ADAPTER                              │
│                                                              │
│  async scrape(): Promise<ScrapedProduct[]>                   │
│    │                                                         │
│    ├─▶ 1. checkRobotsTxt(url)                                │
│    │      → si disallowed : throw + log "robots.txt bloque" │
│    │                                                         │
│    ├─▶ 2. fetchPage(url, page=1)                             │
│    │      ├─ fetch(url, { timeout: 30000 })                  │
│    │      ├─ si 429/503 : backoff (2s, 4s, 8s) + retry      │
│    │      ├─ si 403 : log "anti-bot" → fallback import CSV  │
│    │      └─ si timeout : retry 3x puis throw               │
│    │                                                         │
│    ├─▶ 3. parsePage(html)                                    │
│    │      ├─ extraire produits (sélecteurs spécifiques)      │
│    │      ├─ extraire pagination (next page ?)               │
│    │      └─ retourne { products, nextPage? }                │
│    │                                                         │
│    ├─▶ 4. rateLimit()                                        │
│    │      → attendre 2s avant prochaine requête             │
│    │                                                         │
│    ├─▶ 5. si nextPage → goto step 2 (page++)                │
│    │      → max 50 pages (sécurité)                         │
│    │                                                         │
│    ├─▶ 6. enrichProducts(products)                           │
│    │      → compléter données manquantes (brand, category)  │
│    │                                                         │
│    └─▶ 7. return ScrapedProduct[]                            │
│                                                              │
│  Gestion d'erreurs :                                         │
│    • 1 adapter en échec n'arrête pas les autres              │
│    • SyncRun.status = failed pour cet adapter                │
│    • erreurs stockées dans SyncRun.errors[]                  │
│    • admin notifié dans le dashboard                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Modèles de données (Prisma — à ajouter)

```
model SyncRun {
  id            String    @id @default(cuid())
  adapter       String    // "marjane", "carrefour", "bim", "aswak", "csv_import"
  status        String    // pending, running, dry_run, approved, rejected, completed, failed
  mode          String    // "auto" | "manual" | "dry_run"
  triggeredBy   String    // email admin ou "scheduler"
  startedAt     DateTime  @default(now())
  endedAt       DateTime?
  productsFound Int       @default(0)
  productsNew   Int       @default(0)
  pricesUpdated Int       @default(0)
  promotionsFound Int     @default(0)
  errors        Json      // [{ message, url, timestamp }]
  changes       Json?     // SyncChanges (preview pour dry-run)
  createdAt     DateTime  @default(now())

  @@index([adapter, status])
  @@map("sync_runs")
}

model SyncConfig {
  id            String   @id @default(cuid())
  adapter       String   @unique
  enabled       Boolean  @default(true)
  cronSchedule  String   @default("0 6 * * *")  // quotidien 6h
  lastRunAt     DateTime?
  lastStatus    String?  // dernier status
  maxPages      Int      @default(50)
  rateLimitMs   Int      @default(2000)  // 2s entre requêtes

  @@map("sync_configs")
}
```

---

## API endpoints (scraping)

```
┌────────────────────────────────────────────────────────────────────┐
│  Endpoint                    │ Méthode  │ Rôle    │ Description    │
├──────────────────────────────┼──────────┼─────────┼────────────────┤
│  /api/scraping/runs          │ GET      │ admin   │ Historique     │
│  /api/scraping/runs/:id      │ GET      │ admin   │ Détail run     │
│  /api/scraping/trigger       │ POST     │ admin   │ Lancer sync    │
│  /api/scraping/trigger/:adap │ POST     │ admin   │ 1 adaptateur   │
│  /api/scraping/dry-run       │ POST     │ admin   │ Sync preview   │
│  /api/scraping/:runId/approve│ POST     │ admin   │ Publier        │
│  /api/scraping/:runId/reject │ POST     │ admin   │ Rejeter        │
│  /api/scraping/config        │ GET      │ admin   │ Configs        │
│  /api/scraping/config/:adap  │ PUT      │ admin   │ Modifier config│
│  /api/scraping/import        │ POST     │ admin   │ Import CSV     │
│  /api/scraping/status        │ GET      │ admin   │ Statut live    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Sync Center UI (admin)

```
┌─────────────────────────────────────────────────────────────────────┐
│  SYNC CENTER                                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  STATUT GLOBAL                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │ Dernier  │ │ Prochain │ │ Adapt.   │ │ Produits      │  │   │
│  │  │ sync     │ │ sync     │ │ actifs   │ │ synchronisés  │  │   │
│  │  │ 06:00    │ │ 06:00    │ │ 4/4      │ │ 1,247         │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ADAPTATEURS                                                │   │
│  │  ┌──────────┬────────┬─────────┬────────┬────────────────┐  │   │
│  │  │ Enseigne │ Statut │ Dernier │ Produits│ Action         │  │   │
│  │  ├──────────┼────────┼─────────┼────────┼────────────────┤  │   │
│  │  │ Marjane  │  ● OK  │ 06:00   │  847   │ [Sync] [Config]│  │   │
│  │  │ Carrefour│  ● OK  │ 06:00   │  623   │ [Sync] [Config]│  │   │
│  │  │ BIM      │  ⚠ Err │ 06:00   │  0     │ [Sync] [Config]│  │   │
│  │  │ Aswak    │  ● OK  │ 06:00   │  412   │ [Sync] [Config]│  │   │
│  │  └──────────┴────────┴─────────┴────────┴────────────────┘  │   │
│  │                                                              │   │
│  │  [Tout synchroniser]  [Import CSV]  [Dry-run global]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PREVIEW (après dry-run)                                    │   │
│  │                                                              │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │   │
│  │  │ 12 nouveaux│ │ 47 prix    │ │ 3 promos   │ │ 8 indispo│ │   │
│  │  │  produits  │ │  modifiés  │ │  détectées │ │          │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ Produit          │ Enseigne │ Ancien │ Nouveau │ Δ   │   │   │
│  │  ├──────────────────┼──────────┼────────┼─────────┼─────┤   │   │
│  │  │ Lait Centrale 1L │ Marjane  │ 7.50   │ 6.75    │-10% │   │   │
│  │  │ Huile Lesieur 2L │ Carrefour│ 45.00  │ 42.00   │-7%  │   │   │
│  │  │ Farine Dari 1kg  │ Marjane  │ 8.00   │ 8.50    │+6%  │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  [✓ Tout approuver]  [Sélectionner]  [✗ Rejeter]           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HISTORIQUE                                                 │   │
│  │  ┌──────────┬─────────┬────────┬─────────┬──────────────┐  │   │
│  │  │ Date     │ Adapter │ Mode   │ Statut  │ Produits     │  │   │
│  │  ├──────────┼─────────┼────────┼─────────┼──────────────┤  │   │
│  │  │ 01/09 6h │ Marjane │ auto   │ ✓ OK    │ 847 (12 new) │  │   │
│  │  │ 01/09 6h │ BIM     │ auto   │ ✗ Fail  │ 0 (anti-bot) │  │   │
│  │  │ 31/08 6h │ Carrefour│auto   │ ✓ OK    │ 623 (3 new)  │  │   │
│  │  └──────────┴─────────┴────────┴─────────┴──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Sécurité et respect

```
┌────────────────────────────────────────────────────────────────┐
│  RÈGLES DE SCRAPPING ÉTHIQUE                                    │
│                                                                 │
│  ✓ robots.txt vérifié avant chaque run                         │
│  ✓ Rate limiting : 1 requête / 2 secondes minimum              │
│  ✓ User-Agent identifié : "JaybiBot/1.0 (+contact@jaybi.ma)"  │
│  ✓ Timeout : 30s par page                                      │
│  ✓ Max pages : 50 par adaptateur (configurable)                │
│  ✓ Pas de scraping si l'enseigne bloque (403/429)              │
│  ✓ Fallback : import CSV manuel si scraping bloqué             │
│  ✓ Pas de stockage de données personnelles                     │
│  ✓ Logs : chaque requête est tracée (URL, timestamp, status)   │
│  ✓ Retry : 3 max avec backoff exponentiel (2s, 4s, 8s)        │
│  ✓ Pas de contournement de CAPTCHA ou anti-bot                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Tests prévus

```
┌──────────────────────────────────────────────────────────────────┐
│  TESTS SCRAPING                                                  │
│                                                                  │
│  Unitaires :                                                     │
│  • Normalizer : nettoyage name/unit/weight/price                 │
│  • Matcher : brand+name → score de confiance                     │
│  • Diff : détection changements de prix                          │
│  • Robots.txt parser : allowed/disallowed                        │
│  • Rate limiter : respect du délai                               │
│  • Retry/backoff : calcul des délais                             │
│                                                                  │
│  Fixtures (HTML statique par enseigne) :                         │
│  • Marjane : page produit mock → parse → ScrapedProduct          │
│  • Carrefour : page catégorie mock → pagination                  │
│  • BIM : page mock avec anti-bot → gestion erreur                │
│  • Aswak : page mock simple                                      │
│                                                                  │
│  Intégration :                                                   │
│  • POST /scraping/trigger → SyncRun créé                         │
│  • POST /scraping/dry-run → changes preview                      │
│  • POST /scraping/:id/approve → prix publiés en base             │
│  • POST /scraping/:id/reject → SyncRun rejected                  │
│  • POST /scraping/import → CSV parsé → même pipeline             │
│  • GET /scraping/runs → historique                               │
│  • Permissions : customer → 403                                  │
│                                                                  │
│  E2E (Playwright v0.4) :                                         │
│  • Admin trigger sync → preview → approve → prix visibles        │
└──────────────────────────────────────────────────────────────────┘
```
