# PROJECT — AM32 Configurator (Holmes Hobbies fork)

Fork of `am32-firmware/am32-configurator`. Nuxt 3 / Vue 3, `ssr: false`,
deployed as a Docker container on the AM32 host behind Traefik, served at
`holmes.am32.ca`. Repo: `HolmesHMC/am32-configurator-custom`, branch `master`.

## Architecture

- **Runtime**: single container. `docker/Dockerfile` builds with yarn, the
  release stage runs `node server/index.mjs` on port 3000. Traefik routes
  `Host(holmes.am32.ca)` to it via the external `proxy` network.
- **No datastore.** Redis and the Minio/S3 client were removed 2026-09-01;
  both existed only to hold and cache presigned object-store URLs.
- **File distribution**: `server/api/files.ts` proxies `https://am32.ca/api/files`
  and rewrites the site-relative links it returns into absolute `am32.ca` URLs.
  `server/routes/eeprom.ts` and `server/api/eeprom/[name].ts` proxy the matching
  am32.ca endpoints. Origin is `runtimeConfig.filesOrigin` (env `FILES_ORIGIN`,
  default `https://am32.ca`).
- **Our static assets** (TrailLink APK, TrailLink firmware bins, EEPROM default
  binaries) live in `public/` and are baked into `.output/public` at build time.
  They do not depend on am32.ca.

## Critical Constants

| Thing | Value | Notes |
|---|---|---|
| Host IP (am32.ca and holmes.am32.ca) | `138.199.169.142` | same box, Traefik in front |
| Container port | `3000` | Traefik loadbalancer target |
| Compose defaults | `PREFIX=holmes-`, `DOMAIN=holmes.am32.ca` | upstream's defaults would claim am32.ca |
| Base image | `node:24-bookworm` | pinned; `node:lts` moved to 24.20.0 on 2026-08-27 |
| Package manager | `yarn@4.12.0` via corepack | `packageManager` field is the pin |
| Verified build | Node 20.20.2 and 24.20.0, 2026-09-01 | `yarn install --immutable` + `yarn build` |
| Fork point from upstream | `6f8315d` (2026-03-02) | last `am32-firmware:master` merge |

## Rules

1. **The lockfile is the pin.** `yarn.lock` must stay in Yarn 4 (berry) format —
   `__metadata: version: 8` on line 4. It was a **Yarn 1** lockfile until
   2026-09-01, which meant `yarn install` silently re-resolved the entire tree
   on every build. Never run Yarn Classic (`/opt/homebrew/bin/yarn`, v1.22) in
   this repo; use `corepack yarn`.
2. **The Dockerfile installs with `--immutable`.** If that fails, the lockfile
   and `package.json` have drifted — regenerate deliberately and re-verify a
   build. Do not "fix" it by dropping `--immutable`.
3. **No floating versions.** No `latest` in `package.json`, no `node:lts` in the
   Dockerfile. Both bit us.
4. **Infra files are take-upstream-wholesale; app files are ours.** We had never
   modified `docker/`, `docker-compose.yml` or `.dockerignore` before 2026-09-01,
   which is why they rotted. Ours to defend: `components/SerialDevice.vue`,
   `components/TopNavigation.vue`, `components/EscView.vue`,
   `pages/configurator.vue`, `pages/traillink.vue`, `pages/download.vue`,
   `utils/esc-presets.ts`, `src/communication/direct.ts`, `public/**`, and the
   `routeRules` block in `nuxt.config.ts`.
5. **Never blind-merge upstream.** It is ~6 months ahead with a Prisma/MariaDB
   migration and a rewritten 4-way protocol layer, and it would land on
   `SerialDevice.vue` and `pages/configurator.vue` — our two most customized
   files. Port individual files.
6. **We do not host firmware.** The release-sync uploader (`run.ts`,
   `src/fetch-and-upload-releases.ts`) was deleted; am32.ca owns the files.

## Next Steps

1. Get the fix committed, pushed, and rebuilt on the host — see RESTART.md.
2. Add a `restart: unless-stopped` equivalent check / uptime ping so a silent
   disappearance is noticed in hours, not months.
3. Delete `package-lock.json` and `netlify.toml` (both dead weight).
4. Port the Inrunner / Outrunner / Micro presets to the TrailLink phone app so
   web and phone do not drift. `utils/esc-presets.ts` is the reference.
