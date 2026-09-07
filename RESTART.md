# RESTART — AM32 Configurator (holmes.am32.ca)

## TL;DR
Site is **UP** again as of 2026-09-01 15:32Z. It had been dead for weeks:
Traefik had no router for the host, so everything 404'd at the proxy while
`am32.ca` on the same IP (138.199.169.142) stayed fine.

Fix is live on `origin/master` — `57f7aa0` (retired am32.ca S3 backend replaced
with its public HTTP API) and `f2d3f46` (build pinned, `restart: unless-stopped`
added). The AM32 host rebuilt on its own within ~25 min of the push. No
maintainer was involved, and none is needed.

## How this deploys — read before pushing
The AM32 host polls this repo and rebuilds roughly **once a minute**, so
**pushing to `master` is deploying to production.** Do not push half-finished
work to `master`.

The poller is gated on *new commits*, not an unconditional `up -d --build` —
an unconditional one would have restarted the stopped container by itself and
it never did. That is why the site sat dead from late August: nothing was
pushed, so nothing rebuilt. `restart: unless-stopped` now covers the reboot
case, but a crash with no commits pending can still strand it silently.

A failed build on the host is invisible to us. Always verify locally first:
`corepack yarn install --immutable && corepack yarn build`.

## Verified live after recovery
`/` 302 → `/configurator` · `/configurator`, `/downloads`, `/download`
all 200 · `/api/files?prereleases` returns 5 sections with absolute
am32.ca URLs · `/eeprom` 200 (15,847 bytes) · TrailLink APK 26,329,728 bytes
with the correct APK content-type.

## Next step
Nothing urgent — the site is healthy. Open items are in PROJECT.md; the next
real piece of work is porting the Inrunner/Outrunner/Micro presets to the
TrailLink phone app.

## Notes on the deployment
`docker-compose.yml` no longer references `stack.env`, redis or minio. Defaults
are `PREFIX=holmes-` / `DOMAIN=holmes.am32.ca` (upstream's `""` / `am32.ca`
would collide with the main site); a host-side `.env` still overrides both.

## Follow-ups (not blocking)
- `package-lock.json` (npm) is still committed alongside `yarn.lock`. Inert for
  the Docker build, but a third lockfile in a repo that already had two
  disagreeing ones. Recommend deleting.
- Fork is ~6 months behind `am32-firmware/am32-configurator`. Do not blind-merge:
  upstream added Prisma + MariaDB and rewrote the 4-way protocol layer.
