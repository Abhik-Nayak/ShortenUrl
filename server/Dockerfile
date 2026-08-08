# Builds the Node/Express API into a Docker image.
#
# This is a "multi-stage" build - it runs in two parts:
#   Stage 1 (build):  install everything, turn TypeScript into JavaScript.
#   Stage 2 (final):  a fresh, smaller image with only what is needed to RUN.
# The TypeScript compiler and its tools stay behind in stage 1, so the image
# you actually ship is much smaller.

# ---------- Stage 1: build ----------
FROM node:24-alpine AS build
WORKDIR /app

# Copy only the package files first, then install.
# Docker caches this step, so as long as package.json does not change,
# rebuilds skip the slow "npm ci" and are much faster.
COPY package*.json ./
RUN npm ci

# Now the source code.
COPY tsconfig.json ./
COPY src ./src

# TypeScript -> JavaScript, output goes to /app/dist
RUN npm run build

# ---------- Stage 2: the image that actually runs ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# --omit=dev skips TypeScript, tsx, and type packages.
# They were only needed to build; running the app does not need them.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring over the compiled JavaScript from stage 1.
COPY --from=build /app/dist ./dist

# The Supabase certificate. Without this the app will not start, because
# .env.prod points DATABASE_CA_CERT at certs/supabase-prod-ca-2021.crt
# and src/config/env.ts looks for it relative to this folder.
COPY certs ./certs

# Run as a normal user instead of root. The node image already has this user.
USER node

# Documentation only - it does not open the port to your laptop.
# docker-compose decides what is actually reachable.
EXPOSE 5000

# Start Node directly, NOT "npm start".
# npm does not pass the stop signal through to Node, so "docker compose down"
# would hang for 10 seconds instead of shutting down cleanly.
CMD ["node", "dist/server.js"]
