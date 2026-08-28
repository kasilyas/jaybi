
# 🇲🇦 Jaybi - L'Intelligence Artificielle au service du Pouvoir d'Achat

**Jaybi** est une plateforme "Logistics-Grade" conçue pour devenir l'infrastructure de données centrale entre les foyers marocains et l'industrie agroalimentaire (FMCG).

Ce projet est un **MVP (Minimum Viable Product)** complet, développé pour une mise sur le marché rapide (90 jours). Il combine une expérience utilisateur premium (Mobile-First) avec une "Tour de Contrôle" administrative puissante.

---

## 🛠️ Stack Technique

*   **Core**: React 19, TypeScript
*   **Styling**: Tailwind CSS (Design System "Glassmorphism")
*   **Icons**: Lucide React
*   **AI Engine**: Google Gemini API (via `@google/genai`) pour la recherche sémantique et l'analyse de listes.
*   **Build**: ESModules via `esm.sh` (No-Build setup pour prototyper instantanément dans le navigateur).

---

## 🏗️ Architecture du Projet

Le projet suit une architecture **Monolithique Frontend** (State Lifting) pour le MVP. L'état global est géré dans `App.tsx` et descendu aux composants via les props.

### Arborescence des Fichiers

```text
/
├── index.html              # Point d'entrée, ImportMap, Scripts AdSense
├── index.tsx               # Montage React
├── App.tsx                 # [CŒUR] Gestion d'état global, Routing logique
├── types.ts                # [MODÈLES] Définitions TypeScript (Product, User, etc.)
├── constants.tsx           # Traductions (i18n), Icônes, Config UI
├── data/
│   └── mockData.ts         # Données initiales (Produits, Utilisateurs, Commandes)
├── services/
│   └── geminiService.ts    # Intégration IA (Parsing liste, Suggestions)
└── components/
    ├── AuthModal.tsx       # Gestion connexion + 2FA (Email OTP)
    ├── CartDrawer.tsx      # Panier intelligent (Calculs Promo, Roadmaps)
    ├── ShoppingRoadmap.tsx # [FEATURE CLÉ] Mode GPS pour les courses physiques
    ├── AdminDashboard.tsx  # [BACK-OFFICE] Console d'administration complète
    ├── Admin*.tsx          # Modules spécifiques de l'admin (Produits, CRM, etc.)
    ├── ... (Autres composants UI : ProductCard, PackCard, etc.)
```

---

## 🚀 Guide de Test (Mode Développement)

Pour faciliter la recette et le test des parcours utilisateurs sans friction :

### 1. Authentification Simplifiée
Le système de double authentification (2FA) est actif mais **bypassé** pour le développement.
*   Entrez n'importe quel email.
*   Le code de vérification est fixé à **`123456`**.
*   Ce code s'affiche également dans une bannière jaune "Mode Test" dans la fenêtre de connexion.

### 2. Comptes de Test Pré-configurés
*   **Super Admin**: `admin@qayess.io` (Accès complet à la Console Admin via le bouton "Console" dans le header).
*   **Membre Premium**: `premium@qayess.ma` (Accès fonctionnalités IA illimitées).
*   **Utilisateur Standard**: `user@qayess.ma` (Parcours gratuit classique).

---

## 📦 Modules Fonctionnels (Détails)

### 🛒 Module Front-Office (Client)

1.  **Smart Search (Gemini)** : Barre de recherche prédictive capable de comprendre le langage naturel ("lait pour bébé", "marques italiennes").
2.  **Magic Import (IA)** : Zone de texte permettant de coller une liste de courses en vrac (ex: WhatsApp). L'IA extrait les produits et remplit le panier.
3.  **Comparateur Multi-Enseignes** : Algorithme affichant le meilleur prix (Best Offer) parmi Marjane, Carrefour, BIM et Aswak Assalam.
4.  **Shopping Roadmap** : Une fois le panier validé, l'utilisateur passe en "Mode GPS". L'interface se simplifie pour le magasin :
    *   Tri par rayon/magasin.
    *   Cochage des articles (Checklist).
    *   **Crowdsourcing** : Signalement d'erreurs de prix ou de ruptures de stock en temps réel.
5.  **Packs & Promos** : Gestion des bundles (Packs Ramadan, Packs Entretien) avec remises dynamiques.

### 🛡️ Module Back-Office (Control Tower)

Accessible uniquement aux utilisateurs avec le rôle `admin`.

1.  **Dashboard Overview** : KPIs en temps réel (Volume d'affaires, Taux de conversion, Produits populaires).
2.  **Catalogue Maître (MDM)** : CRUD complet des produits. Gestion des prix multiples par point de vente.
3.  **CRM Utilisateurs** : Gestion des comptes, attribution des rôles, bannissement.
4.  **Gestion des Campagnes** : Création de Packs Promo et de Codes Coupons (avec dates de validité).
5.  **Module de Signalements** : Interface de validation des prix remontés par les utilisateurs (Data Quality).
6.  **Audit Log** : Traçabilité complète de toutes les actions (Login, Modification prix, Suppression compte).

---

## 💰 Monétisation & Business Model

Le projet intègre nativement les vecteurs de revenus :

1.  **Abonnements (SaaS)** : 
    *   Gestion des paliers (Free, Pack1, Pack2, Unlimited) dans `SubscriptionModal` et `AdminSubscriptionModule`.
2.  **Publicité (AdSense)** : 
    *   Composant `AdUnit.tsx` prêt à l'emploi.
    *   Emplacements prévus : In-Feed (entre les produits) et Banner (Bas de page).

---

## ⚖️ Mentions Légales & RGPD

Le projet respecte les normes de confidentialité (Maroc CNDP / RGPD).
*   Les données sont "Soft Deleted" (`isDeleted: true`) pour préserver l'intégrité référentielle des statistiques.
*   Les pages "Mentions Légales" et "Confidentialité" sont accessibles via le composant `LegalView`.

---
*Développé avec passion pour optimiser le quotidien.*
