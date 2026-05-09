# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .

# VITE_API_URL is passed at build time so the compiled JS knows where the API is.
# In production the Nginx reverse proxy handles /api → backend, so this is just
# a safety net in case you want to override.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Stage 2: Serve with Nginx ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (placed next to this Dockerfile)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
