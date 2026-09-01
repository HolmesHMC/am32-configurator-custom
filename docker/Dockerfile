### docker/Dockerfile
#
# The base image is pinned deliberately. This file used to say `node:lts`,
# a moving tag which resolves to Node 24.20.0 as of 2026-08-27 — and nothing
# in the repo ever recorded which Node a given deploy was built against.
# Combined with a non-immutable `yarn install`, every rebuild resolved a
# different dependency tree than the last one. Verified building on both
# Node 20.20.2 and Node 24.20.0 on 2026-09-01.
FROM node:24-bookworm AS base
WORKDIR /usr/src/app

FROM base AS prerelease
WORKDIR /usr/src/app
COPY . .

# corepack provides the yarn version pinned by package.json's "packageManager".
# The previous `yarn set version berry` here defeated that pin and fetched the
# newest yarn at build time; upstream removed it for the same reason in
# am32-firmware/am32-configurator@e3b8480.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV CI='true'
ENV YARN_ENABLE_INLINE_BUILDS='true'
ENV NODE_ENV=production
RUN corepack enable
RUN yarn install --immutable
RUN yarn run build

FROM base AS release
COPY --chown=node:node --from=prerelease /usr/src/app/node_modules node_modules
COPY --chown=node:node --from=prerelease /usr/src/app/.output .

USER node
ENV HOST=0.0.0.0
EXPOSE 3000
ENTRYPOINT [ "node", "server/index.mjs" ]
