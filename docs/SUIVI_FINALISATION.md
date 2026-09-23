# Jaybi — suivi de finalisation

Source : [TODO_FINALISATION.md](TODO_FINALISATION.md). Mise à jour : 21 septembre 2026.

Ce document sépare les corrections réalisées, leurs preuves et les travaux encore ouverts. Une fonction implémentée sans validation réelle reste indiquée comme partielle.

## Réalisé et vérifié

### Environnement et qualité

- Docker Desktop fonctionne. `docker version` et Docker Compose 5.5.1 répondent.
- Une base PostgreSQL QA isolée existe sur `127.0.0.1:55433/jaybi_qa`, avec utilisateur dédié et marqueur de sécurité obligatoire.
- Les 7 migrations, dont le durcissement du checkout et la compatibilité de comparaison historique, s'appliquent sur une base neuve.
- Les 101 tests d'intégration PostgreSQL passent, y compris création de membres administrée, adresses, concurrence promo et idempotence.
- Les images `api`, `seed` et `web` se construisent. L'environnement isolé `jaybi-validation` démarre sur les ports 55434, 4400 et 3317 : base saine, API `health=ok`, API `ready=ready`, 50 produits retournés et frontend HTTP 200. Le frontend est servi statiquement par Nginx, sans téléchargement npm au démarrage.
- `npm audit --omit=dev` retourne 0 vulnérabilité à la racine et dans `backend/`.
- La CI contrôle désormais audits de production, types, tests unitaires, build frontend, E2E, migrations, seed, marqueur QA, tests PostgreSQL et build Docker.

### Authentification et sécurité

- OTP cryptographique à six chiffres, envoyé par SMTP réel hors mode développement.
- Challenges OTP hachés, expirables, à usage unique, limités en tentatives et en fréquence par email ; suppression si l'envoi SMTP échoue.
- Tests avec un serveur SMTP local réel : connexion sans bypass, expiration, rejeu, verrouillage et échec d'envoi.
- Secret JWT obligatoire dans Compose et refus des secrets absents, courts ou de démonstration hors développement.
- Wrapper commun pour les routes asynchrones et gestionnaire d'erreurs JSON sans fuite Prisma ou stack.
- Mapping des erreurs Prisma usuelles, Helmet, CORS configuré et limitation globale/authentification.
- Le frontend ne crée plus de session locale quand l'API d'authentification refuse la demande.
- Gemini passe par deux routes backend authentifiées, limitées et validées. La clé n'est plus intégrée au navigateur ni à l'image frontend.

### Commandes, prix, promotions et packs

- Le serveur recalcule les prix : produit actif, prix disponible et non expiré, enseigne active, quantité bornée.
- Le prix d'origine, la remise appliquée et le prix final sont enregistrés dans chaque ligne de commande.
- Réservation atomique des quotas promo et transaction sérialisable.
- Clé d'idempotence sur les commandes avec détection d'un même identifiant utilisé pour une requête différente.
- Le frontend conserve le panier et affiche l'erreur si la commande est refusée ; aucun faux numéro local n'est créé.
- Un pack exige tous ses produits avec la même quantité. Un pack expiré, vide, partiel ou contenant un autre produit est refusé.
- Les remises sont définies par produit. Pour chaque ligne, la meilleure remise entre la remise publique du produit et celle du pack est retenue, sans cumul. L'interface affiche l'économie réelle, la moyenne pondérée et « Jusqu'à X % ».
- Les mises à jour de prix conservent les identifiants et l'historique dans une transaction au lieu de supprimer les prix.

### Catalogue, rapprochement et administration

- Le rapprochement refuse les EAN contradictoires, marques incompatibles et formats/poids incompatibles ; `1 kg` et `1000 g` sont reconnus comme équivalents.
- Les rapprochements flous deviennent des candidats de revue et ne sont plus publiés automatiquement. La recherche parcourt les candidats par pages au lieu de s'arrêter à 500.
- Revue des rapprochements persistée et actionnable : chaque candidat est une ligne `match_reviews` (statut, décideur, date). L'admin tranche via `POST /api/scraping/reviews/:id` ou en masse `POST /api/scraping/runs/:runId/reviews` ; l'approbation reste bloquée (409 + compteur) tant qu'un candidat est en attente. Accepté → prix appliqué au produit existant ; rejeté → nouveau produit. Le Sync Center affiche la file avec décisions par item et en masse. Runs historiques sans revues persistées : rejet et ré-import (décisions non traçables sinon).
- Une synchronisation vide ne peut plus être approuvée ou publiée comme réussie.
- Les sauvegardes admin n'affichent plus un succès local après un échec API ; les listes acceptent aussi une réponse serveur vide sans réinjecter les données de démonstration.
- La création de membres depuis l'administration est de nouveau opérationnelle via une route serveur réservée aux administrateurs, avec validation, unicité de l'email et audit atomique.
- Le profil persiste le nom, les adresses (ajout, défaut, suppression) et la désactivation. L'interface attend le succès serveur avant de confirmer ou déconnecter.
- Le changement de mot de passe est réel : OTP envoyé sur l'email du compte (`POST /api/auth/password/request-code` puis `/password/confirm`), nouveau hash bcrypt persisté, `passwordChangedAt` invalide les tokens antérieurs (401 `TOKEN_STALE`) et un token frais est renvoyé pour la session courante. L'email reste en lecture seule tant qu'un vrai flux de vérification n'existe pas.

### Migration de la base historique

- La base historique contient 21 872 produits, 21 861 prix, 62 utilisateurs, 19 commandes et 49 packs ; les volumes sont identiques avant et après migration.
- Les 21 862 produits servis par le catalogue correspondent aux produits actifs ; 10 lignes historiques sont archivées.
- Une sauvegarde préalable existe dans `backups/jaybi-pre-migration-20260918.dump`.
- La migration de compatibilité conserve la comparaison active sur les anciennes installations dépourvues du nouveau réglage, sans écraser une désactivation explicite.
- Le frontend Docker utilise désormais une API de même origine via Nginx. La base historique est bien accessible par le frontend, y compris lorsque son port public diffère de 3000.
- Le détail des écarts fonctionnels et des garde-fous se trouve dans [AUDIT_MIGRATION_COMPATIBILITE.md](AUDIT_MIGRATION_COMPATIBILITE.md).
- L’état réel du pipeline Marjane, des sources et de la connexion est documenté dans [AUDIT_SCRAPING_CONNEXION.md](AUDIT_SCRAPING_CONNEXION.md).
- Une collecte d’adaptateur est maintenant mise en file et exécutée par `jaybi-scraping-worker`. Elle termine par un aperçu obligatoire à valider ; elle ne publie aucun prix seule.
- Les offres publiées depuis le pipeline conservent l’adaptateur, l’URL, le vendeur et la date de collecte. Les données anciennes ne sont pas artificiellement réécrites.
- La migration de provenance est appliquée sur la base historique ; API `ready` et interface répondent HTTP 200, et le worker démarre sans run en attente.
- Pour les tests locaux, Mailpit reçoit les OTP sur `http://localhost:8025`; il est isolé de tout envoi externe et ne fait pas partie d’un déploiement de production. Le 21 septembre, un envoi réel de vérification a été accepté par l’API et reçu par Mailpit.
- Le proxy de l’interface résout désormais l’API Docker dynamiquement. Cela évite une erreur 502 après le redémarrage ou le remplacement du conteneur API ; le parcours OTP via `http://localhost:3318/api` a été vérifié après correction.
- L’écran de vérification local propose désormais un lien explicite vers Mailpit lorsque celui-ci est configuré. Ainsi, le testeur sait où récupérer le code ; cette information n’est pas fournie sans `LOCAL_MAILBOX_URL`.
- L’état de l’email/OTP et les prérequis sécurisés des connexions Google, Apple et Facebook sont détaillés dans [AUDIT_AUTHENTIFICATION.md](AUDIT_AUTHENTIFICATION.md). Les boutons sociaux restent désactivés tant que les applications OAuth Jaybi ne sont pas fournies.
- Le mode maintenance est activable depuis l’administration. Les parcours publics reçoivent une réponse 503, tandis que l’authentification et les administrateurs restent accessibles afin de rétablir le service.

## Preuves de non-régression

| Contrôle | Résultat |
|---|---:|
| TypeScript frontend | réussi |
| Tests frontend | 81/81 |
| Build frontend | réussi ; bundle principal ramené à 468 kB |
| TypeScript/build backend | réussi |
| Tests backend unitaires | 191/191 |
| Tests PostgreSQL | 111/111, dont création admin, adresses, concurrence promo, idempotence, revue des rapprochements et changement de mot de passe |
| Intégration ciblée collecte | 21/21 : file, autorisations, import, validation, publication et filtrage des URL source |
| Audits dépendances de production | 0 vulnérabilité, frontend et backend |
| Build Docker | 3/3 images construites |
| Démarrage Docker isolé | DB saine, API prête, web 200 |
| E2E navigateur contrôlé | 7/7 ; API simulée. Les 21 scénarios E2E globaux exigent encore des assertions obligatoires sur la stack QA. |

## Partiellement réalisé

- Le profil persiste le nom, les adresses, permet la désactivation et le changement de mot de passe par OTP (tests d'intégration PostgreSQL : flux complet, ancien token rejeté, mot de passe exigé à la reconnexion). La vérification de changement d'email reste à développer.
- Le stockage OTP est adapté à une instance unique. Redis ou une table dédiée est nécessaire avant un déploiement multi-instance.
- Le traitement de collecte est repris par un worker. La publication reste volontairement initiée dans le cycle HTTP après validation humaine ; une reprise/rollback de publication reste à ajouter.
- La validation Zod est renforcée sur les routes modifiées, mais n'est pas encore généralisée à tous les paramètres de toutes les routes.
- Les scénarios E2E globaux sont encore trop permissifs : plusieurs passent si un élément attendu est absent. Leur remplacement par des parcours QA obligatoires est détaillé dans [AUDIT_TESTS.md](AUDIT_TESTS.md).

## Restant avant mise en production publique

1. Reprise/rollback du publisher après coupure (la revue des rapprochements est terminée depuis le 22/09).
2. Validation live des sources effectuée (23/09) : **Marjane OK via l'index Algolia public** (25 555 produits, remplace le dataset Apify expiré ; EAN absent de l'index), **MyMarket OK** (2 897), **Carrefour OK** (22), **BIM OK** (5, catalogue courant), **Aswak KO** (SPA — 0 produit même via Chromium ; sélecteurs/API à re-sonder ou CSV). Reste : alertes de santé par source et refus explicite de sync vide.
3. Généraliser les schémas d'entrée, limites de pagination, journaux d'audit et identifiants de requête.
4. Ajouter la vérification de changement d'email (le flux mot de passe par OTP est en place) et compléter la gestion des adresses.
5. Exécuter les tests de charge avant ouverture publique.
6. Configurer les secrets de production, SMTP transactionnel, sauvegardes/restauration, supervision et alertes dans l'infrastructure cible.

## Après V1

Les abonnements payants, paiements en ligne, commandes multi-enseignes avancées, applications mobiles, recommandations enrichies et fonctions partenaires restent dans la feuille de route post-V1. Elles ne sont pas considérées comme terminées par ce lot.
