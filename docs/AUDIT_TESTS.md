# Audit des tests Jaybi

Date : 19 septembre 2026.

## Tests réellement exécutés et concluants

| Niveau | Résultat | Ce qui est couvert |
|---|---:|---|
| Frontend unitaire | 81/81 | panier, promotions, affichage catalogue, comparaison, accessibilité d'images, i18n, client API et prix des packs. |
| Backend unitaire | 183/183 | authentification, OTP, JWT, durcissement HTTP, prix, packs, comparaison, IA, rapprochement et adaptateurs de collecte. |
| PostgreSQL d'intégration | 101/101 | droits, CRUD admin, création de membre, adresses, commandes, packs, promotions, concurrence, idempotence, synchronisation et anti-injection. |
| E2E navigateur contrôlé | 7/7 | catalogue, recherche, panier, comparaison, sauvegarde de configuration, mobile/RTL, API indisponible et catalogue vide avec API simulée. |

## Écart constaté sur les E2E globaux

Le projet contient 28 scénarios Playwright. Les 7 du fichier `e2e/redesign.spec.ts` ont été exécutés via une configuration dédiée qui simule l'API. Les 21 scénarios restants sont présents mais ne constituent pas encore une preuve fonctionnelle : plusieurs emploient des conditions du type « si le bouton est visible », puis se contentent de vérifier que la page n'est pas vide.

Les identifiants de démonstration des helpers E2E ont été réalignés le 19 septembre : `user@qayess.ma` et `tech@qayess.ma` remplacent deux adresses inexistantes.

Ainsi, un écran sans bouton de connexion, sans accès administrateur, sans produit, ou sans commande peut faire passer ces scénarios. Ils ne doivent pas être comptés comme une validation de bout en bout.

## Cas à rendre obligatoires avant de déclarer la couverture E2E complète

1. Connexion OTP réelle sur la stack QA, puis refus d'un code expiré, rejoué ou erroné.
2. Connexion admin, création d'un membre, vérification de l'unicité d'email et connexion OTP de ce membre.
3. Catalogue avec données PostgreSQL réelles, recherche, filtre, détails, ajout au panier et offre par enseigne.
4. Pack complet accepté ; pack partiel, expiré ou altéré refusé.
5. Commande COD enregistrée ; refus API conserve le panier ; double clic crée une seule commande.
6. Activation et désactivation de comparaison par administrateur, persistées après rechargement.
7. Administration : produits, marques, enseignes, packs, promos, membres, journal et Sync Center, avec une assertion de succès ou de refus attendue pour chaque action.
8. Injection dans recherche, signalement, suggestion et profil : aucun script exécuté, réponse contrôlée et compte suspendu quand la règle le prévoit.
9. Un test de migration sur une restauration de sauvegarde représentative, comparant les compteurs avant et après.

## Décision de qualité actuelle

Les tests backend et base de données permettent d'avancer sur les correctifs déjà effectués. La non-régression visuelle et les parcours réels restent partiels tant qu'une suite E2E branchée sur la stack QA ne remplace pas les assertions conditionnelles. La production publique reste donc `NO-GO` pour cette raison, entre autres travaux déjà recensés.
