# Copyright (c) "Neo4j"
# Neo4j Sweden AB [http://neo4j.com]
FROM ghcr.io/graphql-hive/gateway:3.0.0@sha256:5a2c65d0f78c2f2349573890458b6206771e8bc1a30496d7cf346af7dae77785
# The supergraph is composed by `npm run compose` and committed; the config only imports what the image already has.
COPY supergraph.graphql gateway.config.ts /gateway/
CMD ["supergraph"]
