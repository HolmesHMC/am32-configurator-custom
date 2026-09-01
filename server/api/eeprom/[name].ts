/**
 * Per-ESC default EEPROM binary.
 *
 * Previously a presigned URL into the 'binaries' bucket on the am32.ca S3
 * gateway, retired upstream in ffdb40e. Proxied from the public am32.ca
 * endpoint; the path it returns is made absolute so callers get a usable URL.
 * See server/api/files.ts for the full background.
 *
 * Note: this fork's own crawler defaults are inlined in utils/esc-presets.ts
 * (commit dba5625), so nothing in our UI depends on this route today.
 */
const getVersion = (version: number) => {
    if (version > 3) {
        return 3;
    }
    return version;
};

// Explicit return type for the same reason as server/routes/eeprom.ts: the
// upstream path matches this route's own path, which otherwise sends Nitro's
// typed-route inference in a circle.
export default defineEventHandler(async (event): Promise<string> => {
    const origin = useRuntimeConfig(event).filesOrigin.replace(/\/+$/, '');
    const version = Number(getQuery(event).version?.toString() ?? '2');
    const name = getRouterParam(event, 'name');

    if (!name) {
        throw createError({
            statusCode: 404
        });
    }

    let path: string;

    try {
        path = await $fetch<string>(`${origin}/api/eeprom/${encodeURIComponent(name)}?version=${getVersion(version)}`);
    } catch (e) {
        throw createError({
            statusCode: 404
        });
    }

    return typeof path === 'string' && path.startsWith('/') ? `${origin}${path}` : path;
});
