# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# --- runtime ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/
# --include=dev: hace falta prisma CLI + ts-node para migrate/seed aunque NODE_ENV=production
RUN npm ci --include=dev && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN sed -i 's/\r$//' /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh \
  && mkdir -p /app/uploads

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
