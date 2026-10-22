# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
FROM ghcr.io/graphql-hive/gateway:2.15.2
# The supergraph is composed by `npm run compose` and committed; the config only imports what the image already has.
COPY supergraph.graphql gateway.config.ts /gateway/
CMD ["supergraph"]
