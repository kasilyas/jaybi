# Sécurité — Jaybi

## Vue d'ensemble

La sécurité de Jaybi est construite en couches : authentification, autorisation, validation, headers HTTP, rate limiting, et audit.

## Authentification

### Flux OTP (One-Time Password)
```
1. POST /auth/request-otp { email, password? }
   → Vérifie mot de passe si compte existant avec passwordHash
   → Génère OTP 6 chiffres (TTL 10 min)
   → Envoie par email (SMTP) ou retourne en dev (DEV_BYPASS)

2. POST /auth/verify-otp { email, code, name? }
   → Vérifie qu'une entrée OTP existe ET n'est pas expirée
   → Trouve ou crée l'utilisateur (customer/free)
   → Signe un JWT (7 jours)
   → Retourne { token, user }
```

### JWT
- **Secret** : `JWT_SECRET` obligatoire en production (throw si manquant)
- **Payload** : `{ sub, email, role }`
- **Expiration** : 7 jours (`JWT_EXPIRES_IN`)
- **Vérification middleware** :
  1. `verifyToken(token)` — signature JWT
  2. **DB lookup** — vérifie user existe, non supprimé, rôle actuel
  3. Le rôle est lu en base (pas dans le token) → anti-escalade persistante

### Dev bypass
- `DEV_BYPASS=true` : code OTP fixe `123456`, `devCode` retourné dans la réponse
- **Impossible en production** : `NODE_ENV=production` force `devBypass=false`
- Endpoints `/auth/test-accounts` et `/auth/dev-login` retournent 404 hors dev
- Comptes test (`testAccounts.ts`) non exposés en prod

## Autorisation

### Rôles
| Rôle | Permissions |
|------|------------|
| `customer` | Lecture produits, panier, commande COD, signalement prix |
| `contributor` | Tout customer + suggestions produits (pending admin) |
| `admin` | Tout + CRUD produits/packs/stores/brands/promo/users, modération, config |

### Middleware
```typescript
authenticate     // Vérifie JWT + DB lookup
requireRole('admin')  // Vérifie le rôle (après authenticate)
```

### Protections
- **Anti-escalade** : nouveau user = `customer`/`free`, rôles gérés par admin uniquement
- **Self-modification interdite** : un user ne peut pas changer son propre rôle/tier
- **Ownership** : un customer ne voit que ses propres commandes (403 sinon)
- **Routes admin** : toutes protégées par `requireRole('admin')`

## Validation des entrées

### Zod sur toutes les routes d'écriture
- `auth.routes.ts` : email, code OTP, password
- `products.routes.ts` : name, category, unit (enum), discount (0-100), flash sale dates
- `orders.routes.ts` : items (min 1), mode (enum), paymentMethod (enum)
- `packs.routes.ts` : name, price, discountPercent
- `promo.routes.ts` : code, discountType (enum), dates, maxUses
- `suggestions.routes.ts` : suggestedData avec schéma strict (anti XSS)
- Toutes les autres routes d'écriture

### Protection XSS
- `suggestedData` validé avec schéma Zod strict (pas de `z.any()`)
- Re-validation au moment du review (defense in depth)
- Champs typés : name (max 200), image (max 500), unit (enum), weight (nonnegative)

### Protection injection SQL
- **Aucune requête raw SQL** dans le code
- Tout passe par l'API Prisma paramétrée

## Headers HTTP (Helmet)

| Header | Valeur | Protection |
|--------|--------|------------|
| `X-Content-Type-Options` | nosniff | MIME sniffing |
| `X-Frame-Options` | DENY | Clickjacking |
| `Strict-Transport-Security` | max-age=31536000 | HTTPS forcing |
| `Content-Security-Policy` | default-src 'self' | XSS, injection |
| `X-XSS-Protection` | 0 | Désactivé (CSP prend le relais) |
| `Referrer-Policy` | no-referrer | Fuite de référent |

En dev, CSP est désactivé pour permettre le hot reload de Vite.

## Rate limiting (express-rate-limit)

| Limite | Fenêtre | Max | Scope |
|--------|---------|-----|-------|
| Global | 15 min | 100 req | Par IP |
| Auth | 15 min | 10 req | Par IP (sur `/api/auth`) |

- Désactivé en mode test (`NODE_ENV=test`)
- Headers standard `RateLimit-*` activés
- Response 429 avec `{ error: 'RATE_LIMITED' }`

## Gestion des erreurs

### En développement
- `err.message` retourné au client (debug)
- Stack trace dans les logs

### En production
- Seul `err.code` est retourné (pas de `err.message`)
- Logs complets côté serveur (`console.error`)
- Codes d'erreur standardisés : `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`

## Audit log

Toutes les actions sensibles sont loggées en base :
- `LOGIN`, `SIGNUP`, `DEV_LOGIN`
- `PRODUCT_CREATE`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`, `PRODUCT_RESTORE`, `PRODUCT_ACTIVATE`, `PRODUCT_DEACTIVATE`
- `ORDER_CREATED`
- `SUGGESTION_CREATE`, `SUGGESTION_REVIEW`
- `USER_UPDATE`, `USER_DELETE`

Chaque log contient : `action`, `user`, `userEmail`, `details`, `type` (success/info/warning/danger), `timestamp`.

## Soft delete

- **Jamais de suppression physique** en base
- `isDeleted: true` + `isActive: false` sur delete
- Restaurable via endpoint dédié
- Préserve l'intégrité référentielle (orders, reports, etc.)
- Les supprimés sont visibles uniquement par l'admin

## Secrets et configuration

### Bonnes pratiques
- `.env` jamais commité (`.gitignore`)
- `.env.example` fourni avec des placeholders
- `JWT_SECRET` : 256+ bits, généré avec `openssl rand -hex 64`
- Mots de passe DB : forts, différents par environnement
- SMTP credentials : dans `.env`, jamais dans le code

### En production
- `JWT_SECRET` : pas de fallback (throw si manquant)
- `DEV_BYPASS` : forcé à `false` (impossible d'activer)
- `CORS_ORIGIN` : URL spécifique (pas `*`)
- Comptes test : endpoints désactivés (404)

## Checklist audit sécurité

| Contrôle | Statut |
|----------|--------|
| DEV_BYPASS impossible en prod | ✅ |
| JWT_SECRET obligatoire en prod | ✅ |
| OTP exige entrée préalable (même dev) | ✅ |
| Password requis pour comptes existants | ✅ |
| Rate limiting (global + auth) | ✅ |
| Helmet (security headers) | ✅ |
| Validation Zod sur toutes les routes | ✅ |
| Pas de SQL raw (Prisma uniquement) | ✅ |
| suggestedData validé (anti XSS) | ✅ |
| JWT DB lookup (rôle en base) | ✅ |
| Soft delete uniquement | ✅ |
| Audit log pour actions admin | ✅ |
| Error handler sans leak en prod | ✅ |
| CORS configuré (pas `*`) | ✅ |
| Ownership vérifié (orders) | ✅ |
| Anti-escalade (nouveau user = customer) | ✅ |
| Promo validation server-side complète | ✅ |
| Health check sans info sensible | ✅ |

## Vulnérabilités connues / limitations

- **JWT sans blocklist** : un token reste valide jusqu'à expiration (7 jours). Le DB lookup empêche l'escalade mais pas l'utilisation d'un token volé. Mitigation future : refresh tokens + blocklist Redis.
- **OTP store en mémoire** : perdu au redémarrage. Multi-instance nécessite Redis. Acceptable pour MVP mono-instance.
- **Pas de MFA** : OTP email est le seul facteur. MFA SMS/app possible en v0.5.
