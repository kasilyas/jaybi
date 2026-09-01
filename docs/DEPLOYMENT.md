# Guide de déploiement — Jaybi

## Vue d'ensemble

Jaybi peut être déployé de trois façons :
1. **Docker Compose** (recommandé pour staging/prod simple)
2. **Manuel** (frontend statique + backend Node)
3. **Plateforme PaaS** (Render, Railway, Fly.io)

## Prérequis de production

### Checklist sécurité (OBLIGATOIRE)

- [ ] `NODE_ENV=production`
- [ ] `DEV_BYPASS=false` (imposé automatiquement en prod, mais expliciter)
- [ ] `JWT_SECRET` : secret aléatoire 256+ bits (ex: `openssl rand -hex 64`)
- [ ] `CORS_ORIGIN` : URL du frontend (pas `*`)
- [ ] `DATABASE_URL` : URL PostgreSQL avec mot de passe fort
- [ ] `SMTP_HOST/USER/PASS` : serveur SMTP configuré (pour OTP réel)
- [ ] Pas de `testAccounts.ts` exposé (les endpoints sont désactivés en prod)
- [ ] Helmet actif (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting actif (100 req/15min global, 10 req/15min auth)

### Générer un JWT_SECRET
```bash
openssl rand -hex 64
# Copier la sortie dans JWT_SECRET
```

## Déploiement Docker Compose

### 1. Préparer le fichier `.env` de production
```env
# Backend
NODE_ENV=production
DATABASE_URL=postgresql://jaybi:PASSWORD_FORT@db:5432/jaybi?schema=public
JWT_SECRET=<openssl rand -hex 64>
DEV_BYPASS=false
CORS_ORIGIN=https://jaybi.ma
PORT=4000

# SMTP
SMTP_HOST=smtp.votre-fournisseur.ma
SMTP_PORT=587
SMTP_USER=no-reply@jaybi.ma
SMTP_PASS=<mot de passe SMTP>
SMTP_FROM=Jaybi <no-reply@jaybi.ma>
```

### 2. Adapter `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: jaybi
      POSTGRES_PASSWORD: <PASSWORD_FORT>
      POSTGRES_DB: jaybi
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: always

  api:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://jaybi:<PASSWORD_FORT>@db:5432/jaybi?schema=public
      JWT_SECRET: <secret>
      DEV_BYPASS: "false"
      CORS_ORIGIN: https://jaybi.ma
    depends_on:
      db:
        condition: service_healthy
    restart: always
    ports:
      - "4000:4000"

  web:
    build: .
    environment:
      VITE_API_URL: https://api.jaybi.ma/api
    restart: always
    ports:
      - "3000:80"

volumes:
  db_data:
```

### 3. Déployer
```bash
# Sur le serveur
git clone https://github.com/kasilyas/jaybi.git
cd jaybi

# Créer .env (backend) avec les valeurs de production
cp backend/.env.example backend/.env
# Éditer backend/.env

# Build et démarrer
docker compose up -d --build

# Migrations + seed
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed

# Vérifier
curl http://localhost:4000/health
# → {"status":"ok"}
```

### 4. Reverse proxy (Nginx)
```nginx
server {
    listen 80;
    server_name jaybi.ma www.jaybi.ma;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jaybi.ma www.jaybi.ma;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Déploiement manuel

### Frontend (statique)
```bash
npm ci
npm run build
# Servir dist/ avec Nginx, Caddy, ou n'importe quel serveur statique
```

### Backend (PM2)
```bash
cd backend
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run build
pm2 start dist/index.js --name jaybi-api
pm2 save
pm2 startup
```

## Déploiement PaaS

### Render
1. Créer un PostgreSQL managed
2. Créer un Web Service pour le backend :
   - Build : `cd backend && npm ci && npx prisma generate && npm run build`
   - Start : `node dist/index.js`
   - Env : `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, etc.
3. Créer un Static Site pour le frontend :
   - Build : `npm ci && npm run build`
   - Publish : `dist/`
   - Env : `VITE_API_URL=https://jaybi-api.onrender.com/api`

### Railway
1. Connecter le repo GitHub
2. Ajouter un plugin PostgreSQL
3. Backend : `backend/` avec `npm run build && npm start`
4. Frontend : build statique

## Mise à jour (update)

```bash
# Pull les dernières modifications
git pull origin master

# Backend
cd backend
npx prisma migrate deploy  # Appliquer nouvelles migrations
npm ci                      # Installer nouvelles dépendances
npm run build

# Frontend
cd ..
npm ci
npm run build

# Redémarrer
docker compose up -d --build
# ou
pm2 restart jaybi-api
```

## Rollback

```bash
# Revenir à la version précédente
git log --oneline -5
git checkout <commit-hash>
docker compose up -d --build

# Rollback DB (ATTENTION : peut perdre des données)
npx prisma migrate resolve --rolled-back <migration_name>
```

## Monitoring

### Health check
```bash
curl https://api.jaybi.ma/health
# → {"status":"ok"}
```

### Logs
```bash
# Docker
docker compose logs -f api
docker compose logs -f web

# PM2
pm2 logs jaybi-api
```

### Métriques à surveiller
- Temps de réponse API (< 200ms)
- Taux d'erreur 5xx (< 1%)
- Utilisation DB (connexions, stockage)
- Rate limiting (429 responses)
- OTP envoyés (volumétrie SMTP)

## Sauvegarde DB

```bash
# Backup
docker compose exec db pg_dump -U jaybi jaybi > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U jaybi jaybi < backup_20260901.sql

# Cron (quotidien à 3h)
0 3 * * * docker compose exec db pg_dump -U jaybi jaybi > /backups/jaybi_$(date +\%Y\%m\%d).sql
```

## Checklist post-déploiement

- [ ] `curl https://api.jaybi.ma/health` → `{"status":"ok"}`
- [ ] Frontend accessible sur `https://jaybi.ma`
- [ ] Login OTP fonctionne (email reçu)
- [ ] `DEV_BYPASS` désactivé (test : `GET /api/auth/test-accounts` → 404)
- [ ] Rate limiting actif (test : 11 requêtes rapides sur `/api/auth` → 429)
- [ ] Helmet headers présents (test : `curl -I https://api.jaybi.ma/health`)
- [ ] CORS correct (test : requête depuis le frontend)
- [ ] HTTPS actif (redirection HTTP → HTTPS)
- [ ] Sauvegarde DB planifiée
