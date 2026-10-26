# ==============================================================================
# ASTRA — Frontend Production Dockerfile (Multi-Stage)
# ==============================================================================
# Build: docker build -t astra-frontend:latest ./frontend
# ==============================================================================

# Stage 1: Build production static bundle with Vite
FROM node:20-alpine AS builder
WORKDIR /workspace

# Copy dependency manifests
COPY package.json package-lock.json* ./

RUN npm ci --prefer-offline --no-audit

# Optional build arguments for split-host deployment
ARG VITE_API_BASE_URL=""
ARG VITE_WS_ENDPOINT_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_ENDPOINT_URL=$VITE_WS_ENDPOINT_URL

# Copy application source code
COPY . .

# Compile TypeScript and bundle production distribution
RUN npm run build

# Stage 2: Lightweight Nginx Alpine web server
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy production build artifacts
COPY --from=builder /workspace/dist/ .

# Copy custom Nginx SPA and reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
