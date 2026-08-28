# --- Jaybi Backend (API Express/TS + Prisma) ---
# Build context = racine du projet. La structure interne mirroire le host
# pour que les imports relatifs du seed (../../data, ../../types) restent valides.
FROM node:22-alpine AS builder
WORKDIR /app

# Dépendances backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Prisma
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

# Code backend
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

# Données frontend partagées avec le seed (source unique de vérité)
COPY data ./data
COPY types.ts ./types.ts

# Build API
RUN cd backend && npm run build

# --- Runtime API ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

# --- Seed (one-shot, exécuté via tsx depuis le stage builder) ---
FROM builder AS seed
WORKDIR /app/backend
CMD ["npx", "tsx", "prisma/seed.ts"]
