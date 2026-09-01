# PROGRESS — AM32 Configurator (Holmes Hobbies fork)

## 2026-09-01 — outage triage + deployment de-rot (uncommitted; HEAD `26bb720`)

### Symptom
`https://holmes.am32.ca/` returned `404 page not found` as `text/plain` with
`x-content-type-options: nosniff` — Traefik's own 404, not Nuxt's. No router
matched the host, i.e. our container was not running. `am32.ca` (same IP,
`138.199.169.142`) served fine, so DNS, host and proxy were all healthy.
Our repo had not changed since 2026-06-01.

### What upstream changed (fork point `6f8315d`, 2026-03-02)
- `e3b8480` (2026-08-23) removed `yarn set version berry` from the Dockerfile.
  Commit message: it "defeated the packageManager pin and needed the network …
  **already applied as a local modification on the deployment host**". Our
  Dockerfile still had that line.
- `ffdb40e` (2026-08-27) retired the S3/Versity gateway entirely; files now come
  from a folder on the host and a public HTTP API. Our `MINIO_*` credentials
  and the buckets behind them are gone.
- `node:lts` (our unpinned base image) moved to Node 24.20.0 on 2026-08-27.
- `@nuxt/content@3.16.0` published 2026-08-27; we had `"latest"`.

### What was verified, and what was not
- **Verified**: the app builds fine with today's floating dependencies, on both
  Node 20.20.2 and Node 24.20.0. The initial hypothesis — that dependency drift
  broke the Docker build — is **wrong**, and was retracted.
- **Verified**: `yarn.lock` was a **Yarn 1** lockfile while `packageManager`
  declared `yarn@4.12.0`. Every build re-resolved all 1,676 packages from the
  registry. Nothing was ever pinned.
- **Verified**: `yarn install --immutable` failed against the committed lockfile.
- **Not verified**: why the container stopped. Leading explanation is that no
  service in `docker-compose.yml` had a `restart:` policy, so a host reboot or
  docker restart would strand it permanently. Settling this needs host access.

### Changes made
Build reproducibility:
- `docker/Dockerfile`: `node:lts` → `node:24-bookworm`; dropped
  `yarn set version berry`; `yarn install` → `yarn install --immutable`; added
  `CI`, `YARN_ENABLE_INLINE_BUILDS`, `COREPACK_ENABLE_DOWNLOAD_PROMPT`.
- `yarn.lock` regenerated in Yarn 4 format (`__metadata: version: 8`).
- Pinned `@nuxt/content` `3.16.0` and `vite-plugin-checker` `0.14.5` (were `latest`).
- `.yarn/install-state.gz` untracked and added to `.gitignore` / `.dockerignore`.
- `docker-compose.yml`: added `restart: unless-stopped`; removed the redis
  services, `redis-net`, and `env_file: stack.env` (a missing stack.env makes
  `docker compose up` fail outright); defaults changed to `PREFIX=holmes-` /
  `DOMAIN=holmes.am32.ca` so the stack cannot claim the main am32.ca site.

Storage replacement (S3 → am32.ca public API):
- `server/api/files.ts` rewritten to proxy `am32.ca/api/files`, absolutising the
  site-relative URLs it returns. Response shape unchanged.
- `server/routes/eeprom.ts`, `server/api/eeprom/[name].ts` rewritten as proxies.
  Both needed explicit return types — the upstream paths match our own route
  paths, which sends Nitro's typed-route inference in a circle (TS7022/TS2321).
- Deleted `composables/useMinio.ts`, `server/plugins/storage.ts`, `run.ts`,
  `src/fetch-and-upload-releases.ts`; dropped `minio`, `ioredis`, `octokit` and
  the broken `upload:files` script.
- `nuxt.config.ts`: `runtimeConfig.redis` → `runtimeConfig.filesOrigin`.

### Verification performed (local, macOS arm64, Node 24.20.0)
- `yarn install --immutable` → exit 0 against the regenerated lockfile.
- `yarn build` → exit 0. eslint clean on all changed files.
- Built server booted; `/` → 302 `/configurator`; `/configurator` → 200.
- `/api/files?prereleases` → 5 sections with absolute am32.ca URLs;
  `?filter=tools` forwarded correctly; `/eeprom` → 200 JSON (15,847 bytes).
- Customizations intact: `/download` 200, `/downloads/TrailLink.apk` 200
  (26,329,728 bytes), `/firmware/traillink/scale_buddy.bin` 200 (1,236,400 bytes).
- **Not** run: an actual `docker build` (local docker daemon is stopped, and the
  x86 colima profile would emulate). The Dockerfile's install/build steps are
  what was verified natively.

### Next
Holmes commits + pushes; the AM32 host maintainer runs
`git pull && docker compose up -d --build` in our stack directory. No new env
vars, volumes or secrets required.
