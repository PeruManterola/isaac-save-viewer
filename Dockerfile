# Builds the static website, then serves it with Static Web Server on port 80.

# Stage 1: build the "dist" directory.
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve it.
# - This image is built from "scratch", so it has no shell or HTTP client that a Docker
#   `HEALTHCHECK` could run. Container health is not reported for that reason.
# - It runs a single static binary and does not need any writable paths.
FROM ghcr.io/static-web-server/static-web-server:2
ENV SERVER_ROOT=/public \
    SERVER_PORT=80
COPY --from=build /app/dist /public
EXPOSE 80
