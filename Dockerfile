# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
# The Wikipedia subgraph (the Neo4j subgraph is grandstack-server with FEDERATION=true).
FROM node:24.22.1-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY wikipedia ./wikipedia
COPY tsconfig.build.json ./
RUN npm run build

FROM node:24.22.1-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /app
ENV NODE_ENV=production PORT=4010
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=20 CMD node -e "fetch('http://localhost:4010/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER node
CMD ["node", "dist/wikipedia/index.js"]
