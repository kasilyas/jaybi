# Audit du scraping Marjane et de la connexion

Date : 21 septembre 2026.

## Origine des produits historiques

La base historique contient plus de 25 000 produits issus d'un import massif associé à Marjane. Le code identifie cette source comme un jeu de données Apify pour `marjanemall.ma`.

Il faut distinguer deux sources officielles :

| Source | Nature | Conséquence métier |
|---|---|---|
| `marjane.ma` | Site officiel Marjane, avec courses en ligne et promotions | Source à privilégier pour des prix d’enseigne et des courses alimentaires. |
| `marjanemall.ma` | Marketplace exploitée par Marjane Mall SA, avec vendeurs tiers | Les prix sont des offres de marketplace. Le vendeur et l’URL source doivent être conservés ; ils ne doivent pas être assimilés automatiquement à un prix de magasin Marjane. |

Les pages officielles confirment l’existence des deux services. La marketplace affiche notamment des vendeurs tiers et des catégories non alimentaires. La provenance historique est donc plausible comme source officielle Marjane Mall, mais elle ne suffit pas à garantir que chaque prix est un prix de rayon Marjane.

## État réel du pipeline

Le pipeline attendu est :

`source autorisée → adaptateur → normalisation → rapprochement → aperçu immuable → validation humaine → publication → historique de prix`

Les étapes de normalisation, rapprochement, aperçu, blocage des cas ambigus, validation et historique de prix existent. La publication refuse un aperçu vide ou un rapprochement ambigu.

Deux lacunes majeures ont été relevées :

1. Le Sync Center ne déclenchait pas l’adaptateur : il ne savait traiter que du CSV ou des produits déjà transmis. Cette lacune est corrigée : une collecte est mise en file par l’administrateur, puis le worker la traite et produit un aperçu `dry_run` à valider. La publication reste une action séparée.
2. L’URL enregistrée dans la configuration n’était pas appliquée à l’adaptateur. Cette incohérence est corrigée : l’URL, la pagination et le délai sont maintenant appliqués au moment du scraping.

## Protections ajoutées

- Une URL configurée doit utiliser HTTPS.
- Chaque adaptateur accepte uniquement ses hôtes autorisés ; la configuration ne peut plus transformer le serveur en client HTTP vers une adresse arbitraire.
- Le type de source est cohérent avec l’adaptateur : Marjane/Apify reste une API, CSV reste un import CSV.
- Pagination : 1 à 200 pages ; délai : 250 ms à 120 secondes.
- Le worker ne revendique qu’un run `pending` à la fois et le marque `running`, `dry_run` ou `failed`. Il conserve une erreur courte et datée.
- La provenance de l’offre publiée est enregistrée : adaptateur, URL produit, vendeur marketplace et date de collecte. Les lignes historiques restent volontairement sans provenance inventée.
- Marjane/Apify extrait désormais le vendeur lorsqu’il est présent dans la réponse source.
- Déploiement local validé le 21 septembre : migration appliquée, API et interface disponibles, worker prêt. Aucun run historique `pending` n’était présent, donc aucune collecte n’a été déclenchée par ce démarrage.

## Procédure opératoire à retenir

1. Vérifier le contrat ou l’autorisation de collecte de la source et son robots.txt lorsque pertinent.
2. Pour Marjane, préciser dans la configuration si le flux est `marjane.ma` ou `marjanemall.ma`; conserver URL, date, vendeur et ville dans les données de staging.
3. Lancer une collecte depuis le Sync Center. Le worker écrit seulement un `SyncRun` et son aperçu ; il ne publie jamais directement depuis l’adaptateur.
4. Contrôler le rapport : volume reçu, taux de rejet, produits sans EAN, offres à zéro, vendeurs, villes et écarts de prix.
5. Examiner les rapprochements ambigus. Aucun run avec ambiguïtés ne doit être publié.
6. Publier après validation, conserver l’historique de prix et lier le rapport à la source.
7. Déclencher une alerte si le volume varie fortement, si un run est vide, si la source répond 403/429/5xx, ou si la fraîcheur dépasse le seuil choisi.

## Connexion et messages

Le serveur utilise un OTP limité, expirant et à usage unique. Le frontend a été corrigé :

- le mot de passe n’est demandé que pour un compte qui en possède un ;
- un mot de passe incorrect, une limitation de demandes, un code expiré/verrouillé ou un échec SMTP reçoivent un message distinct ;
- aucun mot de passe, OTP, jeton ou détail serveur n’est exposé dans le message.

## Travaux encore nécessaires avant automatisation massive

- Ajouter la revue admin persistée, élément par élément, des rapprochements ambigus.
- Valider contractuellement les sources et exécuter un run contrôlé de chaque source avec métriques réelles.
- Ajouter une alerte de dérive de volume, des seuils d’échec et une conservation exploitable des rapports de run.
- Optimiser le rapprochement par lots avant un cycle récurrent de plus de 25 000 articles ; le worker évite le délai HTTP mais ne remplace pas cette optimisation.
