# ──────────────────────────────────────────────────────────────
# STAGE 1 — Build the React (Vite) frontend
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for layer caching
COPY client/package.json client/package-lock.json ./

RUN npm ci && npm cache clean --force

# Copy frontend source
COPY client/ ./

# Build the production bundle
# VITE_API_ORIGIN is baked in at build time — set it via Docker build-arg
ARG VITE_API_ORIGIN=""
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}

RUN npm run build

# ──────────────────────────────────────────────────────────────
# STAGE 2 — Serve with Nginx (minimal ~25 MB image)
# ──────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config for SPA routing
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
