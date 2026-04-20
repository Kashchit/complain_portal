# ──────────────────────────────────────────────────────────────
# STAGE 1 — Production Backend Image
# Node 18 Alpine for minimal image size (~120 MB vs ~900 MB)
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS base

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install ONLY production dependencies (no devDependencies)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy backend source code
COPY server.js db.js ./
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY lib/ ./lib/

# Copy the pre-built frontend (built in CI or multi-stage)
# This will be mounted or copied during deployment
# If client/dist exists, serve it statically in production
COPY client/dist/ ./client/dist/

# Security: switch to non-root user
USER appuser

# Expose the application port
EXPOSE 5000

# Health check — ensures container is actually serving traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Start the server
CMD ["node", "server.js"]
