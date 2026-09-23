# Jaybi — TODO de finalisation

Dernière mise à jour : 17 septembre 2026 — commit `3caa637` + modifications non commitées (refonte visuelle, pilotage admin de la comparaison).

Document de travail listant **tout ce qui reste à faire** avant la production et après. Sources :

- `docs/AUDIT-2026-09-11.md` — constats techniques 1 à 14 (référencés ci-dessous par « Audit #n »)
- `docs/PRELAUNCH_STRATEGY.md` — phases de lancement, cibles, budget
- `AGENTS.md` — règles projet, roadmap, décisions produit

## Légende

- `[ ]` à faire · `[~]` en cours · `[x]` fait · `[!]` bloqué
- **P0** : bloque l'environnement de validation. **P1** : bloque la mise en production (verdict NO-GO). **P2** : durcissement avant montée en charge. **P3** : après lancement V1.
- Chaque item indique son **critère de clôture** (comment savoir que c'est terminé).

## Verdict actuel

- **GO conditionnel** : démonstration / usage interne.
- **NO-GO** : vraies commandes en production, tant que tous les P1 ne sont pas fermés **et** que la validation PostgreSQL/Docker (P0) n'a pas été rejouée avec preuve.

---

## 0. Débloquer l'environnement (P0)

Sans ces éléments, plusieurs P1 ne peuvent pas être prouvés corrigés.

- [x] **P0-1. Docker Desktop fonctionnel.** Le moteur ne démarre pas dans cet environnement (« Docker Desktop is unable to start »).
  - Clôture : `docker version` et `docker compose version` répondent ; `docker compose up -d db` démarre PostgreSQL.
- [x] **P0-2. Base PostgreSQL de test dédiée.** Créer une base QA isolée (autre port / autre nom), jamais la base de catalogue réelle, pour les tests d'intégration et E2E. Un nom contenant « test » ne prouve pas qu'une base est jetable — vérifier la cible avant chaque exécution.
  - Clôture : `DATABASE_URL` de test distinct documentée ; `npx prisma migrate deploy` appliqué dessus.
- [x] **P0-3. Exécuter la suite d'intégration existante.** `backend/tests/integration/` (auth.routes, contributor, crud, products.management, scraping.routes, security.injection) n'a jamais été exécutée sur PostgreSQL réel dans cet environnement.
  - Clôture : `npm exec -- vitest run --config vitest.config.ts` (sans `--exclude`) vert sur la base QA, résultats consignés.
- [x] **P0-4. Build et démarrage Docker Compose.** `docker compose build` des trois images, `run --rm seed`, `up -d api web`, vérification des healthchecks et des logs.
  - Clôture : les 3 conteneurs `healthy` ; une requête API réelle répond depuis le conteneur web.
- [x] **P0-5. Trancher les vulnérabilités `npm audit`.** 3 vulnérabilités modérées transitives (`qs` → `body-parser` → `express`). Un run ultérieur a rapporté 0 — la contradiction doit être résolue en relançant l'audit depuis les lockfiles réels.
  - Clôture : `npm audit --omit=dev` (racine **et** `backend/`) rejoué, résultat documenté ; correctif appliqué seulement après vérification de compatibilité Express.

---

## 1. Bloqueurs production (P1) — Audit #1 à #8

### 1.1 Connexion OTP impossible en production (Audit #1)

`backend/src/lib/otp.ts:21-25`, `backend/src/routes/auth.routes.ts:49-56` — `sendOtpEmail` lève toujours une erreur hors bypass ; SMTP jamais utilisé.

- [x] Implémenter l'envoi email réel (nodemailer/SMTP ou fournisseur transactionnel) en consommant les paramètres SMTP configurés.
- [x] Supprimer l'enregistrement OTP si l'envoi échoue (pas de code orphelin consommable).
- [x] Remplacer `Math.random` par un générateur cryptographique (`crypto.randomInt`).
- [x] Tests : flux complet request-otp → verify-otp **sans** `DEV_BYPASS` ; expiration ; rejet de rejeu ; anti-bruteforce (limite de tentatives par code et par email).
- Clôture : connexion par OTP réel démontrée en environnement de test avec `DEV_BYPASS=false`.

### 1.2 Remise de pack applicable hors périmètre (Audit #2)

`backend/src/routes/orders.routes.ts:34-57` — le `packId` client n'est pas validé : ni composition, ni dates, ni bundle complet.

- [x] Charger les produits du pack et vérifier que **tous** les articles commandés y appartiennent.
- [x] Vérifier activation, dates de validité, quantités, et la règle « pack complet » si elle s'applique.
- [x] Rejeter explicitement tout `packId` invalide (pas de remise silencieuse).
- [x] Tests : pack expiré, pack vide, produit hors pack, pack partiel vs complet.
- Clôture : la reproduction `audit-reproduction-2026-09-11.mjs` (cas pack indu) échoue désormais — le comportement indésirable n'est plus observable.

### 1.3 Fausse commande locale après refus API (Audit #3)

`App.tsx:351-411` — toute erreur de `api.createOrder` poursuit un chemin local qui crée `ORD-*`, vide le panier et affiche un succès.

- [x] Ne vider le panier et afficher le succès **qu'après** un 201/2xx confirmé.
- [x] Distinguer erreur réseau (API injoignable) de refus métier (4xx) : messages différents.
- [x] Supprimer le fallback local de commande, ou le restreindre à un mode démo explicitement marqué (`DEV_BYPASS` uniquement, bandeau visible).
- [x] Ajouter une clé d'idempotence côté serveur pour les retries après réponse perdue.
- [x] Conserver les frais de livraison et la remise promo dans le `total` affiché.
- Clôture : test E2E « API renvoie 4xx → panier conservé, erreur affichée, aucune commande en base ».

### 1.4 Erreurs asynchrones non transmises à Express (Audit #4)

Express 4 installé ne traite pas les promesses rejetées ; de nombreuses routes `async` n'ont ni `try/catch` ni wrapper (`orders.routes.ts`, `app.ts:75`).

- [x] Ajouter un wrapper commun `asyncHandler` (ou `express-async-handler`) appliqué à **toutes** les routes async.
- [x] Centraliser le gestionnaire d'erreurs : réponses JSON structurées `{ error: { code, message } }`, sans stack ni message Prisma brut en production.
- [x] Mapper les erreurs Prisma connues (P2002, P2025…) vers des codes HTTP propres.
- [x] Tests HTTP : produit inexistant, ID malformé, corps invalide → 4xx/5xx propre, processus vivant.
- Clôture : aucun handler async sans wrapper ; test « produit inexistant » renvoie une réponse au lieu de laisser la requête pendante.

### 1.5 Modification de prix destructive et non atomique (Audit #5)

`products.routes.ts:166-182` — `deleteMany` des prix avant update, sans transaction ; `PriceHistory` en `onDelete: Cascade` efface l'historique.

- [x] Réécrire la mise à jour de prix dans une transaction : conserver les IDs, archiver l'ancienne valeur dans `PriceHistory`, remplacer l'entrée courante.
- [x] Appliquer la même règle au publisher scraping (voir §3.4).
- [x] Tests : échec simulé en cours de mise à jour → aucune perte de prix ni d'historique.
- Clôture : historique de prix conservé après N mises à jour ; échec mid-transaction = état inchangé.

### 1.6 Rapprochement de produits de formats différents (Audit #6)

`backend/src/scraping/matcher.ts:59-75` — matching par similarité de nom seule : `Farine 1kg` associée à `Farine 5kg`.

- [x] Interdire les rapprochements avec EAN contradictoires et formats/poids/unités incompatibles.
- [x] Définir des seuils de confiance ; les cas ambigus partent en file de revue manuelle (statut dédié, pas de publication automatique). Persisté dans `match_reviews` : décision admin par item (`POST /api/scraping/reviews/:id`) ou en masse (`POST /api/scraping/runs/:runId/reviews`), approbation bloquée tant que pending, revue interactive dans le Sync Center (22/09).
- [x] Lever la limite arbitraire de 500 candidats ou la justifier et l'instrumenter.
- [x] Fixtures de régression : paires connues de faux matchs (formats, marques proches, multipacks).
- Clôture : les fixtures de faux matchs ne sont plus fusionnées ; les ambiguïtés apparaissent dans une liste de revue admin.

### 1.7 Contexte Docker incompatible avec le Dockerfile backend (Audit #7)

`.dockerignore:6` exclut `backend/` alors que Compose build depuis la racine avec `COPY backend/...`.

- [x] Corriger : `.dockerignore` distincts par contexte, ou contexte de build `backend/` dédié dans Compose.
- [x] Vérifier un build propre des 3 images (api, seed, web) après correction.
- Clôture : `docker compose build --no-cache` réussit de bout en bout (dépend de P0-1).

### 1.8 Secret JWT par défaut accepté en déploiement (Audit #8)

`docker-compose.yml:36` (valeur publique par défaut), `backend/src/config/env.ts:15-17` (garde qui vérifie seulement la présence).

- [x] Rendre `JWT_SECRET` **obligatoire** dans Compose (pas de valeur par défaut exploitable).
- [x] Au démarrage : refuser les secrets vides, courts (<32 chars) ou égaux aux valeurs de démonstration connues, hors `NODE_ENV=development`.
- [x] Documenter génération/rotation du secret ; aucun secret réel dans le dépôt ni dans les logs (`docs/SECURITY_OPERATIONS.md`).
- Clôture : l'API refuse de démarrer en `NODE_ENV=production` sans secret fort fourni.

---

## 2. Durcissement backend (P2) — Audit #9 à #14 et sécurité générale

- [x] **2.1 Prix effectif cohérent carte → panier → commande (Audit #9, P2).** Règle centralisée, calcul serveur autoritatif et snapshots du prix d'origine, de la remise et du prix final.
- [x] **2.2 Quota promo dépassable en concurrence (Audit #10, P2).** Réservation conditionnelle atomique dans une transaction sérialisable ; test PostgreSQL avec quatre requêtes simultanées et `currentUses` limité à 1.
- [x] **2.3 Commande d'offres invalides acceptée (Audit #11, P2).** Produit, prix et enseigne sont contrôlés et testés à la création de commande.
- [~] **2.4 Profil non persisté (Audit #12, P2).** Nom, adresses, désactivation et changement de mot de passe par OTP (`passwordChangedAt` invalide les anciens tokens) sont persistés via l'API. Reste la vérification de changement d'email.
- [x] **2.5 Clé Gemini côté client (Audit #14, P2 — S9 dans AGENTS.md).** Les appels IA passent par des endpoints authentifiés, limités et validés ; la clé reste côté serveur.
- [x] **2.6 Fallback auth frontend sur erreurs métier (Audit — écart connexe).** Aucun refus API ne crée désormais une session locale.
- [ ] **2.7 Validation des entrées API généralisée (S10/écart doc).** Zod (ou équivalent) sur **toutes** les routes : body, query, params, pagination (bornes max), tri, filtres. Aujourd'hui partiel.
- [ ] **2.8 Rate limiting (S10, prévu non implémenté).** Middleware sur : request-otp, verify-otp, login/dev-login, déclenchement scraping, reports, endpoints IA. Règles de lockout et monitoring des abus.
- [ ] **2.9 Journal d'audit des opérations sensibles.** Actor, cible, opération, timestamp, résultat — pour changements de rôles, packs, prix, config (dont `comparisonEnabled`), sync, suppressions. Ne jamais logger OTP, tokens, mots de passe.
- [ ] **2.10 Headers et exposition HTTP.** Vérifier CORS restreint aux origines déclarées, headers de sécurité (helmet ou équivalent), pas de fuite d'infos dans les erreurs.

---

## 3. Scraping, catalogue et qualité des données

Le scraping est le cœur du projet : robustesse technique + simplicité d'usage admin.

### 3.1 Complétude des sources

| Source | Adaptateur | État | Reste à faire |
|---|---|---|---|
| Marjane | `marjane.algolia.adapter.ts` | **25 555 produits validés en live** (index Algolia public, ~2,5 min) : 100 % prix/images, 69 % promos | [x] Remplacé le dataset Apify expiré (HTTP 404) par l'index Algolia du site ; [~] ~1 100 hits perdus dans des buckets saturés (journalisés) ; [ ] EAN absent de l'index (matching par nom+marque+format) |
| MyMarket | `mymarket.adapter.ts` | **2 897 produits validés en live** (Shopify JSON, 27 s) | [x] Pagination complète confirmée (12 pages) |
| Carrefour | `carrefour.adapter.ts` | **22 produits validés en live** (promomaroc, 91 % promos) | [ ] Couvrir tous les catalogues atteignables ; [ ] détecter les nouveaux catalogues |
| BIM | `bim.adapter.ts` | **5 produits validés en live** (catalogue courant uniquement) | [ ] Documenter la limite du parsing texte ; [ ] évaluer OCR/CSV/source alternative |
| Aswak | `aswak.adapter.ts` | **0 produit — SPA non résolue** | [x] Bug `page.evaluate` corrigé dans l'adaptateur Playwright ; [ ] Le site ne livre aucun produit même rendu par Chromium : sélecteurs/API à re-sonder ou import CSV |

- [ ] Pour chaque source : retry, timeout, rate-limit, respect robots.txt, et **refus de publier un résultat vide comme une sync réussie**.
- [ ] Statut de santé par source (dernier succès, nb produits, anomalies) exposé au Sync Center + alerte sur sync vide/échouée.
- [ ] Conserver `productUrl`/preuve source et timestamp de scrape par produit.
- Clôture : run complet des 5 sources avec métriques par source ; aucune source ne peut publier 0 produit en statut « success ».

### 3.2 Qualité d'import

- [ ] Déduplication stable par SKU/EAN/productUrl (les doublons EAN Marjane↔MyMarket sont gérés, à généraliser).
- [ ] Capturer prix final + prix d'origine (promo), marque, catégories, stock, vendeur, images, métadonnées de livraison.
- [ ] Enregistrements malformés : rejet unitaire + rapport d'import, jamais d'abandon du run entier.
- [ ] Rapport d'import post-run : créés, mis à jour, rejetés (avec raisons), non appariés.

### 3.3 Images

- [ ] Job d'audit périodique (`backend/scripts/audit-images.cjs` existe) : détection d'URLs cassées/expirées.
- [ ] Rafraîchissement des images invalides à la sync suivante.
- [ ] Fallback `ProductImage` partout (fait côté composants principaux — vérifier les composants restants) ; placeholder durable catégorie/marque.
- [ ] Évaluer proxy/cache des images distantes (fiabilité, perf) et documenter les questions légales de hotlinking.
- Clôture : audit d'images automatisé rapportant couverture par enseigne ; aucune zone d'image vide à l'écran.

### 3.4 Publisher et runs

- [ ] Sortir la publication longue du cycle HTTP : queue/job worker (`publish-direct.ts` est le contour actuel, pas la cible).
- [ ] Batches resumables + statut par batch + clés d'idempotence ; pas de publication partielle sans état de run explicite.
- [ ] Stratégie de rollback ou de réconciliation documentée.
- [ ] Invalidation de cache après publication.
- [ ] Sync planifiée (cron/scheduler) configurable par source depuis l'admin.
- Clôture : un run de 20 000 produits survit à une coupure et reprend ; le Sync Center affiche progression et statut réel.

### 3.5 Hygiène des données

- [ ] Scripts destructifs (`wipe-all-data.cjs`, `cleanup-*.cjs`) : marqués staging-only, exigent une confirmation explicite de la cible + backup.
- [ ] Vérification post-import : comptages, intégrité référentielle, orphelins.
- [ ] Aucune donnée de test en production (produits, marques, stores, runs, reports).

---

## 4. Frontend et UX

- [x] Refonte visuelle front + admin, grille catalogue, responsive mobile/RTL, modales accessibles (fait — voir addendum audit).
- [x] État vide réel : un catalogue API vide n'affiche plus les produits de démo (régression corrigée).
- [ ] **4.1 Fallback mockData résiduel.** Vérifier qu'aucun autre module (packs, orders, brands, stores) ne substitue des données fictives après une réponse API réussie — le correctif `App.tsx` couvre products/packs/orders, audit des autres modules à faire.
- [ ] **4.2 États explicites partout** : loading, vide, erreur, données périmées (stale) + timestamp de fraîcheur des prix affiché au client.
- [ ] **4.3 i18n complet.** FR/EN/ES/ZH/AR + RTL : relire les chaînes récentes (comparaison, nouveaux états, Sync Center), formats de dates/devises.
- [ ] **4.4 Accessibilité WCAG 2.2 AA ciblée** : contraste, focus visible, navigation clavier complète, lecteur d'écran sur parcours critique (catalogue → fiche → panier → checkout), reduced motion.
- [ ] **4.5 Bundle.** 523 kB JS averti par Vite : code splitting par module (admin séparé du front public), lazy-load des modales.
- [ ] **4.6 Désactivation de fonctionnalité à chaud.** Si l'admin désactive la comparaison pendant qu'elle est ouverte, l'UI doit se fermer proprement (couvert par E2E redesign — généraliser le pattern aux futures features toggles).

---

## 5. Console admin

- [ ] **5.1 Couverture CRUD complète et réelle** : utilisateurs, rôles, packs, abonnements, campagnes/promos, produits, stores, marques, reports, config, sync, audit. Vérifier que chaque action de l'UI persiste côté API — aucune ne doit être purement locale.
- [ ] **5.2 Autorisation serveur sur chaque action admin** (`requireRole`), pas seulement des boutons cachés.
- [ ] **5.3 Pas de faux succès** : chaque échec API affiché comme erreur (pattern corrigé pour `PUT /api/config`, à généraliser).
- [ ] **5.4 Confirmations destructives** : suppression store/produit/utilisateur, wipe, désactivation de source — modale de confirmation + journal d'audit.
- [ ] **5.5 Sync Center intuitif** : déclenchement par source, progression réelle, historique des runs, rapport d'import lisible, file de revue des rapprochements ambigus (§1.6).
- [ ] **5.6 Revue produits** : écran pour les matches incertains, images manquantes, prix aberrants (écarts >X% entre enseignes).
- [ ] **5.7 Console FR-only assumé** (décision produit MVP), mais cohérente avec la nouvelle identité visuelle.

---

## 6. Commandes hybrides COD — v0.5

Modèle métier initial : livraison + paiement à la livraison (COD). CMI/paiement en ligne différé (D12).

- [ ] **6.1 Parcours commande complet** : adresse validée → récap → création serveur → confirmation → suivi. Aujourd'hui partiel.
- [ ] **6.2 Statuts et transitions** : `pending → confirmed → preparing → delivering → delivered | cancelled`, transitions autorisées explicitement, historique par commande.
- [ ] **6.3 COD** : montant dû à la livraison figé dans la commande, mention claire client + admin.
- [ ] **6.4 Zone de livraison** : villes/quartiers couverts configurables ; refus explicite hors zone.
- [ ] **6.5 Gestion admin des commandes** : liste, filtre par statut, changement de statut, annulation, contact client.
- [ ] **6.6 Snapshots** : produit, prix unitaire, remise appliquée, store, ville, quantité figés dans `OrderItem` (indépendants des évolutions catalogue).
- [ ] **6.7 Annulation/retour** : politique minimale (annulation client avant préparation, motif admin) + tests.
- [ ] **6.8 Extensibilité paiement** : modèle `paymentMethod` prêt pour CMI sans refonte (enum + statuts paiement séparés du statut commande).
- [ ] **6.9 Notifications** : confirmation de commande par email (réutilise le transport SMTP de §1.1).

## 7. Packs et abonnements

- [ ] **7.1 CRUD packs admin** complet : composition, dates, remise, activation — avec validation serveur (dépend de §1.2).
- [ ] **7.2 Tiers/abonnements** : gestion des niveaux, droits associés, attribution réservée admin (déjà garanti S8 — à vérifier de bout en bout).
- [ ] **7.3 Cycle de vie** : expiration, renouvellement, annulation, statuts — persistés et vérifiables.
- [ ] **7.4 Contrôles d'éligibilité** : fonctionnalités limitées par tier (ex. comparaison, prix membres) appliqués côté serveur.
- [ ] Tests : limites de tier, expiration, transitions, refus d'accès.

## 8. Compte utilisateur

- [~] Profil persisté : nom et adresses sont couverts ; téléphone reste à définir.
- [x] Adresses multiples : ajout, suppression et adresse par défaut.
- [ ] Suppression/désactivation de compte réelle côté serveur + anonymisation des données personnelles.
- [ ] Invalidation de session après changement d'email/suppression.
- [ ] Export/droit à l'oubli minimal (données personnelles → faire valider par le responsable compétent).

---

## 9. Tests et régression

Règle projet : chaque module a des tests ; les tests ignorés ne comptent pas comme réussis ; les E2E à API simulée ne valent pas validation d'intégration réelle.

- [ ] **9.1 Intégration existante exécutée** (dépend P0-3) puis étendue : orders (packs, promos, concurrence, offres invalides), config, profil, scraping routes, reports.
- [ ] **9.2 Tests de concurrence PostgreSQL** : quota promo (§2.2), mises à jour de prix simultanées, double soumission de commande (idempotence §1.3).
- [ ] **9.3 Auth sans bypass** : suite OTP complète `DEV_BYPASS=false`, expiration JWT, révocation, rôle refusé.
- [ ] **9.4 Régressions scraper** : fixtures de faux matchs (§1.6), enregistrements malformés, doublons, sync vide.
- [ ] **9.5 Frontend** : conserver les 78 tests + ajouter : erreur de commande (§1.3), fallback boundaries par module, états loading/vide/erreur, i18n/RTL.
- [ ] **9.6 E2E Playwright** : remplacer les assertions conditionnelles des 21 scénarios globaux par des assertions obligatoires, puis créer une suite E2E contre la stack réelle (front + API + PostgreSQL QA) : login OTP, catalogue, panier, checkout COD, admin → membres et comparaison, Sync Center, mobile/RTL. Voir `AUDIT_TESTS.md`.
- [ ] **9.7 CI** : pipeline existant (`ci.yml` : typecheck + vitest + build, Postgres service) — ajouter : job E2E Playwright, `npm audit` en warning, intégration backend sur service Postgres, artefact de build production. Vérifier que la CI exécute réellement les tests d'intégration (le job backend lance `vitest run` complet — confirmer qu'ils passent en CI).
- [ ] **9.8 Avant chaque livraison** : régression complète sur le même commit que l'artefact déployé ; consigner commit, commandes, codes de sortie, comptes exacts (réussis/échoués/ignorés).

---

## 10. Docker, environnements et déploiement

- [ ] **10.1 Correctif contexte build** (§1.7) puis build/start/migrations/healthchecks validés (P0-4).
- [ ] **10.2 Séparation des environnements** : dev / QA / prod avec `.env` distincts ; `DEV_BYPASS=false` et comptes de test absents en prod.
- [ ] **10.3 Variables requises documentées** : `DATABASE_URL`, `JWT_SECRET`, SMTP, `CORS_ORIGIN`, URLs API/front — validation au démarrage (fail-fast). Apify n'est plus requis (Marjane passe par l'index Algolia public).
- [ ] **10.4 HTTPS/DNS** : reverse proxy TLS, origines de confiance, pas d'exposition directe des ports internes.
- [ ] **10.5 Conteneurs durcis** : utilisateur non-root, privilèges minimaux, images épinglées.
- [ ] **10.6 Sauvegarde/restauration** : sauvegarde PostgreSQL planifiée + **restauration réellement exécutée** sur cible isolée ; RPO/RTO définis.
- [ ] **10.7 Migrations** : `migrate deploy` testé depuis une version existante (pas seulement une base vierge) ; procédure de rollback compatible données.
- [ ] **10.8 Déploiement reproductible** : procédure écrite de bout en bout, rejouée sur environnement propre.

## 11. Observabilité et exploitation

- [ ] Logs structurés (niveau, contexte, request-id) — sans secrets ni données personnelles.
- [ ] Health/readiness : `/health` (processus) et `/ready` (DB joignable) utilisés par Compose/proxy.
- [ ] Métriques : latence API p95/p99, taux d'erreur, échecs OTP, commandes, runs d'import, produits par source.
- [ ] Alertes : sync échouée ou vide, pic d'erreurs 5xx, quotas promo anormaux.
- [ ] Suivi d'erreurs (Sentry ou équivalent) front + back.
- [ ] Budgets mesurables définis **avant** de déclarer la performance acceptable (latence catalogue, temps de sync).

## 12. Documentation à remettre d'équerre

L'audit note que la doc annonce des garanties absentes du code (SMTP, anti-concurrence promo, Zod partout). Après corrections :

- [ ] `README.md` / `DEVELOPMENT.md` / `DEPLOYMENT.md` : commandes réelles, prérequis, variables d'env, ports.
- [ ] `SECURITY.md` : état réel S1–S10, secrets, rate limiting, politique OTP.
- [ ] `SCRAPING_SCHEMA.md` : limites par source (BIM texte, Aswak SPA, Cloudflare Marjane corporate), données capturées, fréquence.
- [ ] `TESTING.md` : comment lancer unitaires/intégration/E2E, base QA, conventions.
- [ ] `ROADMAP.md` : versions réellement livrées vs planifiées ; compteurs de tests à jour.
- [ ] `API.md` : endpoints réels, codes d'erreur, auth.
- [ ] Procédures d'exploitation : incident, restauration backup, relance de sync.

## 13. Pré-lancement (exécution de `PRELAUNCH_STRATEGY.md`)

- [ ] **Phase 0 — Infra** : domaine, hébergement, DNS/HTTPS, analytics, pages légales (CGU, confidentialité, mentions COD), monitoring.
- [ ] **Phase 1 — Soft launch Casablanca** : recrutement beta, boucle de feedback, support, process de signalement de prix erronés ; cible 5 000 inscrits / 500 DAU / NPS > 40 / rétention J7 > 30 %.
- [ ] **Phase 2 — National** : extension villes, PWA, campagnes (WhatsApp, Instagram/TikTok, micro-influenceurs, presse).
- [ ] **Phase 3 — Monétisation** : COD généralisé, packs, abonnements, offres B2B enseignes.
- [ ] **Phase 4 — Scale** : app mobile native (même API), CMI/paiement en ligne, extension régionale.
- [ ] Budget pré-lancement 62 300 DH : arbitrage et suivi par canal.
- [ ] Process support : tickets, SLA, escalade data-quality.

## 14. Post-V1 (hors périmètre lancement, à planifier)

- [ ] Paiement en ligne CMI (D12) : intégration PSP, webhooks signés, remboursements, réconciliation.
- [ ] Application mobile native consommant la même API (contrats API stables dès V1 — les tests de contrat servent de garantie).
- [ ] Rapprochement produits assisté (score enrichi, revue humaine à grande échelle).
- [ ] Notifications push / alertes prix utilisateur.
- [ ] Multi-vendeurs / marketplace si le modèle évolue.

---

## Checklist finale de lancement (GO/NO-GO)

Ne pas annoncer « prêt pour la production » tant que chaque case n'est pas cochée **avec preuve** :

- [ ] Tous les P0 et P1 fermés, chacun avec test de non-régression.
- [ ] Tests d'intégration et E2E réels verts sur la version exacte à déployer.
- [ ] `docker compose` : build propre, démarrage, healthchecks, migration et restauration démontrés.
- [ ] Aucun secret par défaut, `DEV_BYPASS=false`, aucun compte de test en prod.
- [ ] OTP réel vérifié de bout en bout ; commande COD vérifiée de bout en bout.
- [ ] `npm audit` propre ou exceptions documentées et acceptées.
- [ ] Run scraping complet des 5 sources avec métriques et rapport d'import.
- [ ] Journal d'audit actif sur les opérations admin sensibles.
- [ ] Documentation de déploiement et d'exploitation à jour.
- [ ] Décision GO/NO-GO consignée (date, commit, preuves, signataire).

## Commandes de vérification de référence

```bash
# Frontend (racine)
npm run typecheck && npm test -- --maxWorkers=1 --no-file-parallelism && npm run build

# Backend
cd backend && npm run typecheck && npm run build
npm exec -- vitest run --config vitest.config.ts            # intégration incluse (base QA)
npm exec -- vitest run --config vitest.comparison.config.ts # tests ciblés comparaison

# E2E (API simulée)
npx playwright test --config playwright.redesign.config.ts

# Docker / intégration réelle
docker compose build && docker compose up -d db
docker compose run --rm seed && docker compose up -d api web

# Audit dépendances
npm audit --omit=dev   # racine ET backend/
```
