# Exploitation sécurité Jaybi

## Secrets

Les secrets réels restent dans le gestionnaire de secrets de l'hébergeur. Ils ne doivent apparaître ni dans Git, ni dans les images, ni dans les journaux.

Générer un secret JWT d'au moins 32 octets avec un générateur cryptographique, par exemple `openssl rand -base64 48`, puis le fournir comme `JWT_SECRET`. L'API de production refuse les valeurs absentes, courtes ou connues comme valeurs de démonstration.

Pour une rotation JWT : générer une nouvelle valeur, la déployer dans le gestionnaire de secrets, redémarrer toutes les instances API, puis vérifier `/ready`. La rotation invalide les sessions existantes ; elle doit donc être annoncée comme une reconnexion obligatoire. En cas de suspicion de fuite, effectuer la rotation immédiatement.

`GEMINI_API_KEY` et les paramètres SMTP sont exclusivement des variables serveur. Révoquer puis remplacer une clé exposée avant tout nouveau déploiement.

## Sauvegarde et restauration

Avant une migration ou une publication catalogue importante, réaliser une sauvegarde PostgreSQL datée et chiffrée. Tester régulièrement la restauration sur une base isolée. Les scripts destructifs ne doivent jamais cibler la base de production sans contrôle explicite de l'hôte, du nom de base et d'une sauvegarde récente.

## Contrôles de déploiement

1. Exécuter les audits de dépendances, types, tests unitaires, tests PostgreSQL et E2E.
2. Construire les trois images sans secret de build.
3. Appliquer les migrations avant le trafic et vérifier `/health` puis `/ready`.
4. Vérifier CORS, SMTP, quotas IA, rate limits et absence de `DEV_BYPASS`.
5. Surveiller les erreurs 5xx, échecs OTP, suspensions, dépassements de quota et synchronisations vides.
