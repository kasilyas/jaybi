# --- Jaybi Frontend (Vite build + preview) ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Build production : DEV_BYPASS désactivé, clé Gemini via build arg (optionnel)
ARG VITE_GEMINI_API_KEY=""
ENV VITE_DEV_BYPASS=false
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
RUN npm run build

# --- Runtime : serveur statique ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev vite && npm cache clean --force

EXPOSE 4173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
