# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
FROM ghcr.io/graphql-hive/gateway:2.15.4@sha256:57b51105c1e6a2328dcf2f395a01449ac9c84c80defb704f49f99d16c184aa6b
# The supergraph is composed by `npm run compose` and committed; the config only imports what the image already has.
COPY supergraph.graphql gateway.config.ts /gateway/
CMD ["supergraph"]
