# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
FROM ghcr.io/graphql-hive/gateway:2.15.6@sha256:9efd6e26ea6df65537c1ca52ea010b683b0ec5c989474b96efaec0b4ed4854a3
# The supergraph is composed by `npm run compose` and committed; the config only imports what the image already has.
COPY supergraph.graphql gateway.config.ts /gateway/
CMD ["supergraph"]
