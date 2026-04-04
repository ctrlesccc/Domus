FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json

RUN npm ci

COPY . .

RUN npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/app/prisma/dev.db

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/prisma/bootstrap.sql /opt/domus/bootstrap.sql
COPY --from=build /app/prisma/migrate_v6.sql /opt/domus/migrate_v6.sql
COPY --from=build /app/prisma/seed.ts ./prisma-seed/seed.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/prisma /app/storage/documents /app/storage/import /app/backups

VOLUME ["/app/prisma", "/app/storage", "/app/backups"]

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
WORKDIR /app/server
CMD ["node", "dist/index.js"]
