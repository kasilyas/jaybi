# Audit de migration et compatibilité fonctionnelle

Date de contrôle : 18 septembre 2026.

## État des données historiques

La base historique PostgreSQL `jaybi`, exposée localement sur le port `5433`, n'est pas vide. Le contrôle effectué avant et après migration donne les mêmes volumes :

| Donnée | Volume conservé |
|---|---:|
| Produits | 21 872 |
| Produits actifs visibles dans le catalogue | 21 862 |
| Produits archivés | 10 |
| Prix | 21 861 |
| Enseignes | 7 |
| Utilisateurs | 62 |
| Commandes | 19 |
| Packs | 49 |
| Synchronisations | 5 |

Le répertoire `data/` contient encore les données de démonstration TypeScript. Il ne constitue pas la base réelle de l'application. Les données historiques sont dans PostgreSQL.

Une sauvegarde complète a été créée avant migration : `backups/jaybi-pre-migration-20260918.dump` (6 960 807 octets).

La migration `20260918100000_checkout_hardening` a ensuite été appliquée sur la base historique. Elle ajoute les champs nécessaires aux remises par produit, à l'idempotence des commandes et à la traçabilité des prix. Aucun compteur historique n'a diminué après son application.

La migration de compatibilité `20260918233000_preserve_existing_comparison` restaure la comparaison pour une configuration historique qui ne possède pas encore le nouveau réglage. Elle ne remplace jamais un choix explicite déjà enregistré.

## Compatibilité fonctionnelle contrôlée

| Fonction | État | Observation |
|---|---|---|
| Catalogue et prix historiques | Opérationnel | 21 862 produits actifs servis par le frontend via `/api`; les 10 autres sont archivés. |
| Packs | Opérationnel et renforcé | Pack complet obligatoire, quantité identique, remise par produit, affichage de la moyenne pondérée et de « Jusqu'à X % ». |
| Panier et commandes | Opérationnel et renforcé | Prix recalculés côté serveur, idempotence et contrôle des quotas promo. |
| Administration produits, marques, enseignes, packs et promos | Opérationnel | Les écritures attendent désormais la confirmation du serveur. |
| Création de membres par un administrateur | Restauré | Route serveur protégée, validation stricte, email unique et journal d'audit. Le membre se connecte ensuite par OTP. |
| Comparaison | Restaurée et désactivable | Les anciennes installations sans le nouveau réglage conservent la comparaison activée. L'administrateur peut ensuite la désactiver dans Administration > Configuration. |
| Import de liste et suggestions IA | Disponible sous conditions | Connexion requise et clé `GEMINI_API_KEY` configurée sur le serveur. La clé n'est plus exposée au navigateur. |
| Profil | Partiel | Nom, adresses et désactivation sont persistés. Changement d'email vérifié et vrai changement de mot de passe restent à réaliser. |
| Synchronisation fournisseurs | Partiel | Dry-run, validation et publication existent. La revue manuelle persistée des rapprochements et un worker reprenable restent à réaliser. |

## Correctif de raccordement frontend/API

L'image frontend utilisait auparavant une adresse API figée sur `localhost:4000`. Cette adresse cassait l'accès aux données dès que le frontend était publié sur un autre port ou une autre machine. Le frontend utilise maintenant `/api`, et Nginx transmet les requêtes au conteneur API. Ce raccordement a été vérifié :

- environnement de validation : 50 produits via le frontend sur le port `3317` ;
- base historique : 21 862 produits actifs via le frontend sur le port `3318` ;
- API historique : état `ready`.

## Garde-fous contre une nouvelle perte fonctionnelle

1. Exécuter les migrations sur une copie restaurée de la base historique avant toute livraison.
2. Comparer automatiquement les compteurs avant/après par table et arrêter la livraison en cas de baisse non expliquée.
3. Maintenir une matrice des parcours critiques : connexion OTP, catalogue, comparaison, pack complet, code promo, commande, profil et chaque opération admin.
4. Exécuter les tests unitaires, les 99 tests PostgreSQL, les tests E2E et le démarrage Docker sur le même commit que l'image livrée.
5. Tester chaque fonction conditionnelle dans ses deux états et consigner les variables nécessaires, notamment `GEMINI_API_KEY`.
6. Conserver une sauvegarde vérifiée et effectuer périodiquement une restauration complète sur une base isolée.

## Travaux encore ouverts

- Ajouter une action administrateur persistée pour accepter ou rejeter chaque candidat de rapprochement.
- Finaliser le changement d'email vérifié et le changement de mot de passe.
- Déplacer les traitements longs de synchronisation dans un worker reprenable.
- Valider les cinq sources réelles de collecte, avec preuves source, reprises et alertes.
- Mettre en place le test automatique de migration depuis une sauvegarde représentative et la comparaison de compteurs.
- Effectuer une restauration complète de la sauvegarde dans un environnement isolé et mesurer les délais de reprise.
