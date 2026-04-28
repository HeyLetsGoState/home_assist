# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY . .

# Vite bakes these into the JS bundle at build time
ARG VITE_HA_URL
ARG VITE_HA_TOKEN
ARG VITE_PIHOLE_PASSWORD
ARG VITE_PORTAINER_TOKEN
ARG VITE_TAUTULLI_TOKEN
ENV VITE_HA_URL=$VITE_HA_URL
ENV VITE_HA_TOKEN=$VITE_HA_TOKEN
ENV VITE_PIHOLE_PASSWORD=$VITE_PIHOLE_PASSWORD
ENV VITE_PORTAINER_TOKEN=$VITE_PORTAINER_TOKEN
ENV VITE_TAUTULLI_TOKEN=$VITE_TAUTULLI_TOKEN

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config as a template — PIHOLE_HOST and NETDATA_HOST are
# substituted at container startup via envsubst (see CMD below)
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost/ || exit 1

# Substitute only our two vars so nginx's own $uri / $remote_addr are untouched
CMD ["/bin/sh", "-c", \
  "envsubst '${PIHOLE_HOST} ${NETDATA_HOST} ${PORTAINER_HOST} ${TAUTULLI_HOST}' \
   < /etc/nginx/conf.d/default.conf.template \
   > /etc/nginx/conf.d/default.conf \
   && nginx -g 'daemon off;'"]
