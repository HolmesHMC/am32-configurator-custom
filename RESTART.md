# RESTART — AM32 Configurator (holmes.am32.ca)

## TL;DR
Site is **DOWN**: Traefik on the AM32 host has no router for `holmes.am32.ca`,
so every request returns a plain-text `404 page not found` at the proxy. Our
container is not running. `am32.ca` itself (same IP, 138.199.169.142) is fine.

Nothing on our side changed since 2026-06-01. The host changed underneath us.

Fix is **pushed to `origin/master` at `e0864c0`**. The two fix commits are
`3b6ba1f` (S3 backend replaced with am32.ca's public HTTP API) and `e207d1d`
(build pinned, restart policy added), plus docs commit `e0864c0` on top. Verified
locally — `yarn install --immutable` + `yarn build` green on Node 20.20.2 and
24.20.0, server boots, all routes serve. The site remains down until the AM32
host maintainer rebuilds the Docker stack.

## What is NOT proven
The container being stopped is confirmed; **why** is not. The build itself is
fine (verified), so the leading explanation is operational — our compose had no
`restart:` policy, so a host reboot or docker restart would strand it. Reading
the host's `docker compose ps` would settle it; we have no host access.

## Next step
1. Ask the AM32 host maintainer (tridge / alka) to run, in our stack directory:
   `git pull && docker compose up -d --build`
   No new env vars, no volumes, no secrets are needed any more.
2. Confirm `https://holmes.am32.ca/` → 302 → `/configurator`, and that the
   Downloads tab lists firmware.

## Notes for whoever runs the rebuild
- `docker-compose.yml` no longer references `stack.env`, redis, or minio.
- Defaults are now `PREFIX=holmes-` / `DOMAIN=holmes.am32.ca`. Upstream's
  defaults (`""` / `am32.ca`) would have collided with the main site.
- If a host-side `.env` already sets PREFIX/DOMAIN, it still wins.

## Follow-ups (not blocking)
- `package-lock.json` (npm) is still committed alongside `yarn.lock`. Inert for
  the Docker build, but it is a third lockfile in a repo that already had two
  disagreeing ones. Recommend deleting.
- `netlify.toml` is dead — the host runs the Nuxt server, not Netlify.
- Fork is ~6 months behind `am32-firmware/am32-configurator`. Do not blind-merge:
  upstream added Prisma + MariaDB and rewrote the 4-way protocol layer.
