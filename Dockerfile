# ──────────────────────────────────────────────────────────────
# Multi-stage build: builds the React frontend, then runs the
# full-stack app as a single container (Express serves the
# static assets in production mode).
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder

WORKDIR /build

COPY client/package.json client/package-lock.json ./
RUN npm ci && npm cache clean --force

COPY client/ ./

ARG VITE_API_ORIGIN=""
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}

RUN npm run build


# ──────────────────────────────────────────────────────────────
# Final image: Express backend + pre-built frontend
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

COPY server.js db.js ./
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY lib/ ./lib/

# Copy built frontend from the builder stage
COPY --from=frontend-builder /build/dist ./client/dist/

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
