# --- Jaybi Frontend (Vite build + preview) ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Build production : DEV_BYPASS désactivé
ENV VITE_DEV_BYPASS=false
ENV VITE_API_URL=/api
RUN npm run build

# --- Runtime : serveur statique sans installation dynamique ---
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
