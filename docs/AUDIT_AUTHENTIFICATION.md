# Audit d’authentification

Mise à jour : 22 septembre 2026.

## Parcours email

Le parcours principal est une authentification par email et code à usage unique :

1. l’utilisateur indique son email ;
2. le serveur génère un code cryptographique à six chiffres ;
3. le code est haché en mémoire, expire en dix minutes, ne peut servir qu’une fois et se verrouille après trop d’essais ;
4. le serveur émet une session JWT seulement après vérification.

Les mots de passe ne sont demandés que si le compte possède déjà un mot de passe. Les comptes de démonstration n’en possèdent pas : leur connexion se fait donc exclusivement par code.

Pour Docker local, Mailpit reçoit les codes sur `http://localhost:8025`. L’interface fournit maintenant ce lien après l’envoi. Mailpit est isolé du réseau public et ne doit jamais être activé en production.

## Réseaux sociaux

Google, Apple et Facebook sont actuellement **désactivés** dans l’interface. Aucun bouton ne crée de session locale ni ne prétend avoir authentifié un utilisateur. Leur activation demande des applications OAuth/OIDC détenues par Jaybi :

| Fournisseur | Prérequis à fournir | Callback à enregistrer |
|---|---|---|
| Google | Client ID, client secret, URL de production | `https://<domaine>/api/auth/oauth/google/callback` |
| Apple | Service ID, Team ID, Key ID, clé privée `.p8` | `https://<domaine>/api/auth/oauth/apple/callback` |
| Facebook | App ID, app secret, URL de production | `https://<domaine>/api/auth/oauth/facebook/callback` |

La mise en production de ces flux doit utiliser Authorization Code + PKCE, un paramètre `state` signé et à usage unique, des redirections strictement autorisées, la vérification serveur des jetons et des claims (`issuer`, `audience`, expiration, nonce), ainsi qu’un rattachement par identifiant fournisseur immuable. Aucun jeton fournisseur ne doit être accepté depuis le navigateur comme preuve d’identité sans validation serveur.

## État et suite

- Email/OTP : opérationnel et testé avec SMTP local réel.
- Google / Apple / Facebook : interface honnêtement désactivée ; implémentation en attente des identifiants et domaines OAuth de Jaybi.
- Avant ouverture publique : choisir le fournisseur SMTP transactionnel, déplacer les challenges OTP vers Redis ou PostgreSQL pour plusieurs instances, gérer la révocation/rotation des sessions et enregistrer les événements d’authentification sans secrets.
