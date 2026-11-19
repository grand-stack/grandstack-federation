# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
# The Wikipedia subgraph (the Neo4j subgraph is grandstack-server with FEDERATION=true).
FROM node:24.22.3-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY wikipedia ./wikipedia
COPY tsconfig.build.json ./
RUN npm run build

FROM node:24.22.3-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54
WORKDIR /app
ENV NODE_ENV=production PORT=4010
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=20 CMD node -e "fetch('http://localhost:4010/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER node
CMD ["node", "dist/wikipedia/index.js"]
