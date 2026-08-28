
# 📋 Checklist Fonctionnelle & Registre des Règles de Gestion - Jaybi

Ce document est le registre officiel des fonctionnalités et règles de gestion implémentées dans le projet Jaybi. **Règle d'or : On ajoute, on ne supprime rien sans mon accord.**

## 🏗️ Vision & Socle Technique
- [x] **Design System Professionnel** : Look "Glassmorphism", polices Inter, animations fluides (Framer-like).
- [x] **Internationalisation (i18n)** : Support complet FR, EN, ES, ZH, AR (RTL inclus).
- [x] **Responsive Design** : Mobile-first, compatible tablettes et desktops.
- [x] **Accessibilité** : Respect des standards ARIA.
- [x] **Mode Hors-ligne** : Fonctionnement optimisé pour les zones à faible connexion.
- [x] **Monétisation AdSense** : Emplacements publicitaires optimisés (In-feed & Sidebar) pour Google AdSense.
- [x] **Conformité Légale** : Pages dédiées Mentions Légales et Politique de Confidentialité (RGPD/CNDP ready).
- [x] **Documentation Technique** : README complet avec architecture et guide de test.

## 🛒 Expérience Client (Frontend)
- [x] **Recherche Intelligente** : Moteur de recherche par nom, marque ou catégorie avec suggestions Gemini.
- [x] **Matrice Comparative** : Comparaison croisée Enseignes vs Villes pour trouver le prix optimal.
- [x] **Roadmap Logistique** : Itinéraire physique de courses optimisé (GPS-ready) avec système de "check" des articles.
- [x] **Reprise de Roadmap** : Bouton d'accès rapide pour reprendre une session en cours.
- [x] **Partage & Impression** : Export de la liste en texte ou format imprimable.
- [x] **Module Profil Utilisateur** : Modification des données, statistiques personnelles et sécurité.
- [x] **Suppression de compte (Soft Delete)** : Archivage logique via le Profil.
- [x] **Double Authentification (Mode Dev)** : Code fixe `123456` affiché dans l'UI pour faciliter les tests.

## 🛡️ Console d'Administration (Control Tower)
- [x] **Tableau de Bord (Overview)** : Statistiques avancées de conversion et volume d'affaires.
- [x] **Module de Signalements** : Centre de contrôle pour valider les prix rapportés par le terrain.
- [x] **Catalogue Maître (Master Data)** : CRUD complet produits et marques.
- [x] **CRM Utilisateurs** : Gestion des paliers d'abonnement et des rôles.

## 📏 Règles de Gestion Implémentées
1. **Zéro Suppression Physique** : Tout archivage passe par `isDeleted: true`.
2. **Priorité Prix** : Algorithme `bestPrice` automatique par défaut.
3. **Persistance Roadmap** : Indicateur visuel permanent si une session est active.
4. **Validation Signalement** : Feedback visuel obligatoire après report de prix.
5. **Vérification Email Bypass** : Le code de vérification est fixé à `123456` pour la phase de test.
6. **Sécurité d'Initialisation** : Hooks React ordonnés pour éviter les erreurs de référence temporelle (Hoisting fix).

---
*Dernière mise à jour : Documentation & Bypass Auth UI.*
