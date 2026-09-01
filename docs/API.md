# API Reference — Jaybi

Base URL : `http://localhost:4000/api` (dev) / `https://api.jaybi.ma/api` (prod)

## Authentification

Toutes les routes protégées nécessitent le header :
```
Authorization: Bearer <jwt_token>
```

### POST /auth/request-otp
Démarre le flux 2FA. Génère un OTP et l'envoie par email (prod) ou le retourne (dev).

**Body :**
```json
{ "email": "user@example.com", "password": "optional" }
```
- `password` : requis si le compte existe et a un `passwordHash`

**Response 200 :**
```json
{ "sent": true, "devCode": "123456" }
```
- `devCode` uniquement si `DEV_BYPASS=true`

### POST /auth/verify-otp
Vérifie l'OTP. Crée le compte si nouvel email (customer/free).

**Body :**
```json
{ "email": "user@example.com", "code": "123456", "name": "Optional Name" }
```

**Response 200 :**
```json
{ "token": "eyJ...", "user": { "id": "...", "email": "...", "role": "customer", "tier": "free" } }
```

### GET /auth/me
Profil de l'utilisateur authentifié.

**Auth :** Bearer token

**Response 200 :**
```json
{ "id": "...", "email": "...", "name": "...", "role": "customer", "tier": "free", "isPremium": false, "savingsScore": 0 }
```

### GET /auth/test-accounts *(dev only)*
Liste les comptes de test. 404 en production.

### POST /auth/dev-login *(dev only)*
Auto-connexion sans OTP pour un compte de test. 404 en production.

**Body :** `{ "email": "admin@qayess.io" }`

---

## Products

### GET /products
Liste publique des produits actifs et non supprimés.

**Response 200 :**
```json
[{
  "id": "...", "name": "Lait Centrale 1L", "brand": "Centrale",
  "category": "Lait", "image": "...", "unit": "L", "weight": 1,
  "isNational": true, "isDeleted": false, "isActive": true,
  "discountPercent": null, "flashSalePercent": null,
  "flashSaleActive": false, "effectiveDiscountPercent": 0,
  "prices": [{ "store": "Marjane", "city": "Casablanca", "price": 7.5, "available": true }]
}]
```

### GET /products/:id
Détail d'un produit (404 si supprimé).

### GET /products/admin/all *(admin)*
Tous les produits, y compris supprimés et inactifs.

### GET /products/admin/deleted *(admin)*
Uniquement les produits soft-deleted.

### POST /products *(admin)*
Crée un produit.

**Body :**
```json
{
  "name": "Lait Centrale 1L",
  "brandId": "brand_id_or_null",
  "category": "Lait",
  "image": "url",
  "unit": "L",
  "weight": 1,
  "isNational": true,
  "isActive": true,
  "discountPercent": 10,
  "flashSalePercent": 25,
  "flashSaleStartsAt": "2026-09-01T08:00:00Z",
  "flashSaleEndsAt": "2026-09-03T23:59:59Z",
  "flashSaleLabel": "Flash Weekend",
  "prices": [{ "storeId": "...", "city": "Casablanca", "price": 7.5 }]
}
```

### PUT /products/:id *(admin)*
Met à jour un produit (partial — seuls les champs fournis sont modifiés).

### DELETE /products/:id *(admin)*
Soft-delete (`isDeleted=true`, `isActive=false`). Jamais de suppression physique.
- 400 `ALREADY_DELETED` si déjà supprimé

### POST /products/:id/restore *(admin)*
Restaure un produit soft-deleted.
- 400 `NOT_DELETED` si non supprimé

### PATCH /products/:id/activate *(admin)*
Active un produit (le rend visible publiquement).

### PATCH /products/:id/deactivate *(admin)*
Désactive un produit (invisible publiquement, non supprimé).

---

## Orders

### POST /orders *(authentifié)*
Crée une commande (COD).

**Body :**
```json
{
  "mode": "delivery",
  "paymentMethod": "cod",
  "promoCodeId": "optional",
  "items": [{ "productId": "...", "storeId": "...", "city": "Casablanca", "quantity": 2, "packId": "optional" }]
}
```

**Response 201 :**
```json
{ "id": "...", "total": 35, "deliveryFee": 20, "status": "pending", "items": [...] }
```

- Snapshot des prix unitaires (avec remise pack si applicable)
- Validation promo : dates, minOrder, cap 100%, transaction atomique
- SavingsScore incrémenté si prix promo

### GET /orders/me *(authentifié)*
Commandes de l'utilisateur connecté.

### GET /orders *(admin)*
Toutes les commandes.

### GET /orders/:id *(authentifié)*
Détail d'une commande. 403 si non-propriétaire et non-admin.

---

## Packs

### GET /packs
Liste publique des packs.

### POST /packs *(admin)*
Crée un pack.

**Body :**
```json
{ "name": "Pack Ramadan", "description": "...", "price": 200, "originalPrice": 250, "discountPercent": 20, "theme": "ramadan" }
```

### PUT /packs/:id *(admin)*
Met à jour un pack.

### DELETE /packs/:id *(admin)*
Soft-delete.

---

## Promo Codes

### GET /promo
Liste des codes promo.

### POST /promo *(admin)*
Crée un code promo.

**Body :**
```json
{
  "code": "WELCOME10",
  "discountType": "percent",
  "discountValue": 10,
  "maxUses": 100,
  "startsAt": "2026-09-01T00:00:00Z",
  "expiresAt": "2026-09-30T23:59:59Z",
  "minOrderAmount": 50
}
```

### DELETE /promo/:id *(admin)*
Soft-delete.

---

## Users *(admin)*

### GET /users
Liste tous les utilisateurs.

### GET /users/:id
Détail d'un utilisateur.

### PUT /users/:id
Met à jour rôle/tier. **Strict enum** : `role` ∈ {customer, contributor, admin}, `tier` ∈ {free, pack1, pack2, unlimited}.

### DELETE /users/:id
Soft-delete (`isDeleted=true`).

---

## Stores *(admin CRUD)*

### GET /stores
Liste publique.

### POST /stores *(admin)*
```json
{ "name": "Marjane", "logo": "url", "city": "Casablanca" }
```

### DELETE /stores/:id *(admin)*
Soft-delete.

---

## Brands *(admin CRUD)*

### GET /brands
Liste publique.

### POST /brands *(admin)*
```json
{ "name": "Ariel", "logo": "url" }
```

### DELETE /brands/:id *(admin)*
Soft-delete.

---

## Reports (signalements prix)

### POST /reports *(authentifié)*
Signale un prix.

**Body :**
```json
{ "productId": "...", "storeName": "Marjane", "city": "Casablanca", "reportedPrice": 6.5, "comment": "Prix vu le 01/09" }
```

### GET /reports *(admin)*
Liste tous les signalements.

### PATCH /reports/:id/status *(admin)*
```json
{ "status": "verified" }
```
- `status` ∈ {pending, verified, rejected}

---

## Suggestions *(contributor/admin)*

### POST /suggestions *(customer/contributor/admin)*
Propose une création/modification de produit.

**Body :**
```json
{
  "productId": "null_or_existing_id",
  "suggestedData": { "name": "Nouveau Produit", "category": "Catégorie", "unit": "unit" },
  "comment": "Suggestion"
}
```

### GET /suggestions *(contributor/admin)*
- Contributor : voit uniquement ses suggestions
- Admin : voit toutes les suggestions

### PATCH /suggestions/:id/review *(admin)*
Valide ou rejette une suggestion.

**Body :** `{ "status": "verified" }` ou `{ "status": "rejected" }`

Si `verified` :
- Avec `productId` : met à jour le produit existant
- Sans `productId` : crée un nouveau produit (requiert name + category)

---

## Audit *(admin)*

### GET /audit
Liste tous les logs d'audit.

---

## Config

### GET /config
Configuration de la plateforme (tiers, maintenance).

### PUT /config *(admin)*
Met à jour la configuration.

---

## Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_INPUT` | 400 | Validation Zod échouée |
| `UNAUTHORIZED` | 401 | Token manquant ou invalide |
| `INVALID_TOKEN` | 401 | JWT invalide ou expiré |
| `ACCOUNT_DISABLED` | 401 | Compte supprimé ou désactivé |
| `FORBIDDEN` | 403 | Rôle insuffisant |
| `NOT_FOUND` | 404 | Ressource inexistante |
| `ALREADY_DELETED` | 400 | Produit déjà soft-deleted |
| `NOT_DELETED` | 400 | Produit non supprimé (restore impossible) |
| `PASSWORD_REQUIRED` | 401 | Mot de passe requis pour compte existant |
| `INVALID_CREDENTIALS` | 401 | Mot de passe incorrect |
| `OTP_EXPIRED` | 400 | OTP expiré ou inexistant |
| `WRONG_CODE` | 400 | Code OTP incorrect |
| `RATE_LIMITED` | 429 | Rate limit global dépassé |
| `RATE_LIMITED_AUTH` | 429 | Rate limit auth dépassé |
| `INTERNAL_ERROR` | 500 | Erreur serveur |
