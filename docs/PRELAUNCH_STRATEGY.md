# Jaybi — Stratégie de Pré-Lancement

## Vue d'ensemble

Jaybi est une plateforme marocaine de comparaison de prix et de courses en ligne.
Ce document décrit la stratégie go-to-market étape par étape.

---

## 1. Cibles (Targets)

### 1.1 Cibles principales

| Cible | Description | Taille estimée | Priorité |
|-------|-------------|----------------|----------|
| **Ménages urbains** | Familles à Casablanca, Rabat, Marrakech qui font leurs courses hebdomadaires | ~2M foyers | P1 |
| **Étudiants & jeunes actifs** | 18-35 ans, budget sensible, mobile-first, achètent en ligne | ~3M personnes | P1 |
| **Femmes au foyer** | Décideuses d'achat, cherchent les meilleurs prix, WhatsApp-first | ~1.5M | P1 |

### 1.2 Cibles secondaires

| Cible | Description | Taille estimée | Priorité |
|-------|-------------|----------------|----------|
| **Expatriés marocains** | MRE qui envoient des colis/course au pays | ~500K | P2 |
| **Petits commerçants** | Épiceries de quartier qui veulent comparer les prix de gros | ~200K | P2 |
| **Influenceurs food/lifestyle** | Créateurs de contenu cuisine, moms, lifestyle au Maroc | ~2000 | P2 |

### 1.3 Cibles B2B (phase 2)

| Cible | Description | Priorité |
|-------|-------------|----------|
| **Enseignes partenaires** | Marjane, Carrefour, MyMarket pour affiliation | P3 |
| **Marques FMCG** | Lesieur, Centrale, Dari pour sponsoring de catégorie | P3 |
| **Apps de livraison** | Glovo, Amana pour intégration commande | P3 |

---

## 2. Audience (Personas)

### Persona 1 — "Fatima, la maman économe"

- **Âge** : 35-50 ans
- **Lieu** : Casablanca, quartiers résidentiels
- **Revenu** : Classe moyenne, 8000-15000 DH/mois
- **Comportement** : Fait ses courses au Marjane ou Aswak Assalam le samedi
- **Pain point** : Les prix changent tout le temps, ne sait pas où c'est le moins cher
- **Canaux** : WhatsApp, Facebook, Instagram
- **Message** : "Économisez jusqu'à 30% sur vos courses hebdomadaires"
- **KPI** : Économies réalisées par semaine (affiché dans l'app)

### Persona 2 — "Youssef, le jeune actif"

- **Âge** : 22-32 ans
- **Lieu** : Casablanca, Rabat, Marrakech
- **Revenu** : 6000-12000 DH/mois
- **Comportement** : Achète en ligne (Jumia, MyMarket), mobile-first
- **Pain point** : Pas le temps de comparer, veut le meilleur prix rapidement
- **Canaux** : Instagram, TikTok, Twitter
- **Message** : "Le meilleur prix en 3 secondes, sans bouger de ton canapé"
- **KPI** : Temps de recherche vs temps sans Jaybi

### Persona 3 — "Khadija, l'étudiante budgétaire"

- **Âge** : 18-25 ans
- **Lieu** : Villes universitaires
- **Revenu** : 1500-3000 DH/mois (bourse + aides)
- **Pain point** : Budget très serré, chaque dirham compte
- **Canaux** : TikTok, Instagram, WhatsApp groups
- **Message** : "Ne paie jamais le prix fort. Compare avant d'acheter."
- **KPI** : Économies mensuelles totales

---

## 3. Pitchs (Value Propositions)

### 3.1 Pitch principal (elevator pitch)

> **Jaybi** — Le premier comparateur de prix de courses au Maroc.
> Comparez les prix de 5600+ produits dans tous les supermarchés marocains
> (Marjane, Carrefour, MyMarket, BIM, Aswak Assalam) en temps réel.
> Économisez jusqu'à 30% sur vos courses hebdomadaires.

### 3.2 Pitchs par canal

#### Réseaux sociaux (Instagram/TikTok) — 15 secondes

> "Tu sais combien coûte ton lait à Marjane vs Carrefour ? Non ?
> Jaybi compare pour toi. 5600 produits, 5 enseignes, 1 app.
> Arrête de payer trop cher. #Jaybi #CoursesMaroc"

#### WhatsApp — message viral

> "Salam! J'ai trouvé cette app qui compare les prix des courses au Maroc.
> J'ai économisé 200 DH cette semaine sur mes courses 🤑
> Lien: [jaybi.ma]
> Essaie, c'est gratuit!"

#### Presse / blog — version longue

> "Jaybi, la startup marocaine qui révolutionne les courses en ligne.
> En agrégeant les catalogues de 5 enseignes majeures (Marjane, Carrefour,
> MyMarket, BIM, Aswak Assalam), Jaybi permet aux consommateurs de comparer
> les prix de plus de 5600 produits en temps réel. La plateforme utilise
> une technologie de scraping avancée pour mettre à jour les prix
> quotidiennement, offrant ainsi une transparence totale sur le marché
> de la grande distribution au Maroc."

#### Pitch investisseur

> "Jaybi adresse un marché de 8M de foyers urbains marocains qui dépensent
> en moyenne 2000 DH/semaine en courses. Notre plateforme agrège déjà 5600+
> produits de 5 enseignes via scraping automatisé. Modèle : affiliation
> commande (COD hybride), puis marketplace, puis B2B data.
> TAM : 800M DH/an en commission commande.
> Nous cherchons 500K DH seed pour scaling et acquisition utilisateur."

### 3.3 Pitchs par persona

| Persona | Pitch |
|---------|-------|
| Fatima (maman) | "Jaybi t' montre où c'est le moins cher pour ton panier de courses. Économise 200-500 DH/semaine." |
| Youssef (jeune actif) | "Compare les prix en 3 sec. Commande en 1 clic. Paiement à la livraison." |
| Khadija (étudiante) | "Budget serré ? Jaybi trouve le magasin le moins cher pour chaque produit. Gratuit." |

---

## 4. Stratégie de Déploiement — Étape par Étape

### Phase 0 : Préparation (Semaines 1-2)

#### Étape 0.1 — Finalisation technique
- [x] Base de données PostgreSQL avec 5600+ produits réels
- [x] Scraping automatisé (Marjane, MyMarket, BIM, Carrefour, Aswak)
- [x] Frontend React avec i18n (FR/EN/ES/ZH/AR)
- [x] Backend API Express/TypeScript
- [x] Authentification JWT + OTP
- [x] Console admin (Sync Center, gestion produits/stores/brands)
- [x] Tests E2E Playwright (21 tests)
- [ ] **À faire** : Déploiement Docker en production
- [ ] **À faire** : Domaine `jaybi.ma` + SSL
- [ ] **À faire** : Hébergement (DigitalOcean / OVH Maroc / AWS)

#### Étape 0.2 — Infrastructure de production
- [ ] Configurer `docker-compose.prod.yml`
- [ ] Variables d'environnement production (`.env.prod`)
- [ ] CI/CD : GitHub Actions → build → push images → deploy
- [ ] Monitoring : uptime, erreurs, performance
- [ ] Backup automatique PostgreSQL (quotidien)

#### Étape 0.3 — SEO technique
- [ ] Sitemap.xml généré (5600+ URLs produits)
- [ ] Meta tags dynamiques par produit (title, description, og:image)
- [ ] Schema.org Product markup (prix, disponibilité, marque)
- [ ] robots.txt optimisé
- [ ] Pages catégories indexables (Épicerie, Boissons, Hygiène, etc.)

### Phase 1 : Soft Launch — Casablanca (Semaines 3-6)

#### Étape 1.1 — Beta fermée (100 utilisateurs)
- **Objectif** : Valider l'UX, collecter feedback, corriger bugs
- **Cible** : 50 mamans (Fatima) + 30 jeunes actifs (Youssef) + 20 étudiants (Khadija)
- **Canal de recrutement** :
  - WhatsApp groups de quartiers (Anfa, Sidi Maarouf, Ain Diab)
  - Posts Facebook dans groupes "Casablanca maman"
  - Amis et famille
- **Incitation** : Accès gratuit + tirage au sort carte cadeau Marjane 500 DH
- **Durée** : 2 semaines
- **Métriques** :
  - Taux d'activation (ouverture app > 3 fois/semaine)
  - NPS (Net Promoter Score) > 40
  - Bugs critiques < 5
  - Feedback qualitatif (10 interviews utilisateurs)

#### Étape 1.2 — Beta ouverte (500 utilisateurs)
- **Objectif** : Tester la charge, valider le modèle d'engagement
- **Canal** :
  - Post Instagram sponsorisé (budget 2000 DH)
  - Stories Instagram influenceurs micro (10 influenceurs, 5K-20K followers)
  - Post Facebook sponsorisé (budget 1000 DH)
  - WhatsApp viral loop (partage d'économies réalisées)
- **Durée** : 2 semaines
- **Métriques** :
  - DAU (Daily Active Users) > 100
  - Rétention J7 > 30%
  - Panier moyen comparé > 5 produits
  - Taux de conversion (comparaison → commande) > 5%

#### Étape 1.3 — Lancement public Casablanca
- **Objectif** : 5000 utilisateurs en 2 semaines
- **Canal** :
  - Presse marocaine : Hespress, Le360, Telquel, Médias24
  - Communiqué de presse (en FR et AR)
  - Instagram Ads (budget 5000 DH, ciblage Casablanca 18-50 ans)
  - TikTok Ads (budget 3000 DH, ciblage 18-35 ans)
  - Influenceurs mid-tier (3 influenceurs 50K-100K followers, budget 5000 DH)
  - WhatsApp Business (catalogue partagé dans groups)
- **Métriques** :
  - Inscriptions : 5000
  - DAU : 500
  - MAU (Monthly Active Users) : 2000
  - Économies totales affichées : 100K DH cumulés

### Phase 2 : Expansion nationale (Mois 2-3)

#### Étape 2.1 — Rabat & Marrakech
- **Objectif** : 10 000 utilisateurs cumulés
- **Adaptation** :
  - Ajouter villes Rabat, Marrakech dans le frontend
  - Scraping adapté par ville (prix peuvent varier)
  - Influenceurs locaux Rabat/Marrakech
- **Canal** :
  - Géolocalisation Ads (Rabat + Marrakech)
  - Presse locale
  - Partenariats universités (IAV, ENSA, UCA)

#### Étape 2.2 — Toutes les grandes villes
- **Objectif** : 30 000 utilisateurs cumulés
- **Villes** : + Tanger, Fès, Agadir, Meknès, Oujda
- **Canal** :
  - Campagne nationale TV/radio (budget 50K DH, 1 spot régional)
  - Radio : Medi1, Chada FM, Hit Radio (sponsoring météo + mention Jaybi)
  - Affichage digital : gares, aéroports (budget 20K DH)

#### Étape 2.3 — Version mobile (PWA → App native)
- **Objectif** : 50 000 utilisateurs, 60% via mobile
- **Actions** :
  - PWA (Progressive Web App) — installable depuis le navigateur
  - Soumission App Store + Google Play (React Native ou wrapper)
  - Notifications push (alertes prix sur produits suivis)
  - Widget WhatsApp (partage d'économies)

### Phase 3 : Monétisation & Partenariats (Mois 4-6)

#### Étape 3.1 — Commandes hybrides COD
- **Objectif** : 1000 commandes/mois, panier moyen 300 DH
- **Modèle** :
  - Commission 3-5% par commande (négociation enseignes)
  - Cash on delivery (paiement à la livraison)
  - Paiement en ligne : phase ultérieure (CMI)
- **KPI** : Taux de conversion comparaison → commande > 8%

#### Étape 3.2 — Packs & abonnements
- **Objectif** : 500 abonnés payants
- **Offre** :
  - **Gratuit** : comparaison de prix, alertes basiques
  - **Pack Premium (29 DH/mois)** : alertes illimitées, historique prix, listes illimitées, recommandations IA
  - **Pack Famille (49 DH/mois)** : 5 comptes, panier partagé, planning repas
- **KPI** : Taux de conversion free → premium > 3%

#### Étape 3.3 — Partenariats B2B
- **Marques FMCG** : sponsoring de catégorie (ex: "Lesieur" sur la catégorie huiles)
- **Enseignes** : featured placement, données de marché anonymisées
- **Apps de livraison** : intégration API (Glovo, Amana)
- **Revenu cible** : 50K DH/mois en sponsoring + data

### Phase 4 : Scale & Mobile (Mois 7-12)

#### Étape 4.1 — App mobile native
- React Native (iOS + Android)
- Notifications push intelligentes (baisse de prix sur produit suivi)
- Scan de code-barres en magasin (compare instantanément)
- Mode hors-ligne (prix en cache)

#### Étape 4.2 — Paiement en ligne (CMI)
- Intégration CMI (Centre Monétique Interbancaire)
- Cartes bancaires marocaines (CMI)
- Wallet mobile (Inwi Money, CashPlus)
- Apple Pay / Google Pay (si supporté par CMI)

#### Étape 4.3 — Expansion régionale
- Tunisie (marché similaire, même enseignes partiellement)
- Algérie (si régulation le permet)
- Côte d'Ivoire / Sénégal (Afrique de l'Ouest francophone)

---

## 5. Budget & Ressources

### Budget pré-lancement (3 mois)

| Poste | Budget (DH) | Détail |
|-------|-------------|--------|
| Hébergement | 3 000 | VPS + DB + CDN (3 mois) |
| Domaine | 300 | jaybi.ma (1 an) |
| SSL | 0 | Let's Encrypt gratuit |
| Design/UX | 5 000 | Logo + assets + landing page |
| Ads Instagram | 10 000 | Phase 1 + Phase 2 |
| Ads TikTok | 5 000 | Phase 1 |
| Ads Facebook | 5 000 | Phase 1 + Phase 2 |
| Influenceurs | 15 000 | 15 influenceurs (micro + mid) |
| Presse/PR | 2 000 | Communiqués + relations presse |
| Radio | 10 000 | Sponsoring Hit Radio / Medi1 |
| Contenu | 5 000 | Photos, vidéos, blog SEO |
| Divers | 2 000 | Imprévus |
| **Total** | **62 300** | ~6 200 € |

### Équipe minimale

| Rôle | Temps | Rémunération/mois |
|------|-------|-------------------|
| Développeur full-stack | Full-time | 15 000 DH |
| Growth marketer | Part-time | 8 000 DH |
| Community manager | Part-time | 5 000 DH |
| **Total/mois** | | **28 000 DH** |

---

## 6. KPIs & Objectifs

### KPIs produit

| KPI | Phase 1 | Phase 2 | Phase 3 |
|-----|---------|---------|---------|
| Produits en base | 5 600 | 10 000 | 20 000 |
| Sources actives | 5 | 8 | 12 |
| Mise à jour prix | Hebdo | Quotidienne | Temps réel |
| Couverture villes | 1 | 5 | 15 |

### KPIs utilisateurs

| KPI | Phase 1 (S6) | Phase 2 (M3) | Phase 3 (M6) |
|-----|--------------|--------------|--------------|
| Inscriptions | 5 000 | 30 000 | 100 000 |
| DAU | 500 | 3 000 | 15 000 |
| MAU | 2 000 | 15 000 | 60 000 |
| Rétention J7 | 30% | 35% | 40% |
| NPS | 40 | 45 | 50 |

### KPIs business

| KPI | Phase 1 | Phase 2 | Phase 3 |
|-----|---------|---------|---------|
| Commandes/mois | 0 | 500 | 5 000 |
| Panier moyen | — | 250 DH | 300 DH |
| Abonnés premium | 0 | 50 | 1 500 |
| Revenu/mois | 0 | 5 000 DH | 80 000 DH |

---

## 7. Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Scraping bloqué (Cloudflare) | Élevée | Élevé | Apify + multiples sources + CSV fallback |
| Concurrence (Jumia, Hmizate) | Moyenne | Moyen | Focus courses quotidiennes vs deals ponctuels |
| Adoption lente | Moyenne | Élevé | Beta fermée + influenceurs + WhatsApp viral |
| Prix incohérents | Faible | Élevé | Validation admin + Sync Center + audit |
| Régulation données | Faible | Moyen | Sources publiques + robots.txt respecté |
| Paiement en ligne | Moyenne | Moyen | COD d'abord, CMI en phase 4 |

---

## 8. Timeline résumé

```
Semaine 1-2  : Phase 0 — Préparation technique + infra
Semaine 3-4  : Phase 1.1 — Beta fermée (100 users)
Semaine 5-6  : Phase 1.2-1.3 — Beta ouverte + lancement Casa
Mois 2       : Phase 2.1 — Expansion Rabat + Marrakech
Mois 3       : Phase 2.2-2.3 — Toutes villes + PWA mobile
Mois 4       : Phase 3.1 — Commandes COD
Mois 5       : Phase 3.2 — Packs & abonnements
Mois 6       : Phase 3.3 — Partenariats B2B
Mois 7-12    : Phase 4 — App native + paiement CMI + expansion régionale
```

---

## 9. Avantages concurrentiels

1. **5600+ produits réels** — plus grand catalogue comparé au Maroc
2. **5 enseignes** — Marjane, Carrefour, MyMarket, BIM, Aswak Assalam
3. **Scraping automatisé** — prix mis à jour sans intervention manuelle
4. **i18n complet** — FR, EN, ES, ZH, AR (seul comparateur multilingue au Maroc)
5. **Sync Center admin** — interface intuitive pour l'administrateur
6. **API mobile-ready** — prête pour l'app native
7. **Soft-delete & audit** — conformité et traçabilité
8. **PWA installable** — pas besoin d'app store pour commencer

---

*Dernière mise à jour : Jaybi v0.5.1 — 5625 produits réels, 95.8% avec images*
