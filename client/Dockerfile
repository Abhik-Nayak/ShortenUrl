# Builds the React app, then puts the finished files inside an nginx image.
#
# Stage 1 turns the React source into plain HTML/JS/CSS files.
# Stage 2 throws away Node entirely and just serves those files with nginx.
# The final image has no Node and no source code in it - only the built site.

# ---------- Stage 1: build the React app ----------
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first so Docker can cache this step.
COPY package*.json ./
RUN npm ci

# Copy the rest of the client folder.
# (.dockerignore stops node_modules and dist from being copied.)
COPY . .

# Vite builds the site into /app/dist
RUN npm run build

# ---------- Stage 2: serve the built files ----------
FROM nginx:alpine

# The built site goes where nginx looks for files to serve.
COPY --from=build /app/dist /usr/share/nginx/html

# Our routing rules: which URLs are React pages, which go to the API.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
