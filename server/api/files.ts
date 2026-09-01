/**
 * Firmware / bootloader / tool listing.
 *
 * am32.ca used to expose these through an S3 (Versity) gateway that this app
 * talked to directly, using credentials injected from stack.env on the host.
 * Upstream retired that gateway in am32-firmware/am32-configurator@ffdb40e
 * (2026-08-27): files now live in a plain directory on the am32.ca host, and
 * the listing is published over an unauthenticated HTTP API.
 *
 * We have no mount on that host, so we read the public API and rewrite its
 * relative links to absolute ones. The response shape is unchanged, so
 * pages/downloads.vue needs no changes.
 */

interface UpstreamFile {
    name: string;
    url?: string;
    downloadUrl?: string;
}

interface UpstreamFolder {
    name: string;
    files?: UpstreamFile[];
    children?: UpstreamFolder[];
}

const absolutise = (origin: string, folder: UpstreamFolder): BlobFolder => ({
    name: folder.name,
    files: (folder.files ?? []).map(file => ({
        name: file.name,
        // upstream returns site-relative paths like /api/file/releases/v2.20/x.hex
        url: file.url?.startsWith('/') ? `${origin}${file.url}` : (file.url ?? '')
    })),
    children: (folder.children ?? []).map(child => absolutise(origin, child))
});

export default defineEventHandler(async (event) => {
    const origin = useRuntimeConfig(event).filesOrigin.replace(/\/+$/, '');
    const query = getQuery(event);

    const params = new URLSearchParams();
    if (query.filter !== undefined && query.filter !== null) {
        params.set('filter', query.filter.toString());
    }
    if (query.prereleases !== undefined) {
        params.set('prereleases', '');
    }
    const search = params.toString();

    let upstream: { data?: UpstreamFolder[] };

    try {
        upstream = await $fetch<{ data?: UpstreamFolder[] }>(`${origin}/api/files${search ? `?${search}` : ''}`);
    } catch (e) {
        throw createError({
            statusCode: 502,
            statusMessage: `could not reach the AM32 file index at ${origin}`
        });
    }

    return {
        data: (upstream.data ?? []).map(folder => absolutise(origin, folder))
    };
});
