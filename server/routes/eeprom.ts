/**
 * EEPROM settings schema.
 *
 * Previously read from the 'schemas' bucket on the am32.ca S3 gateway, which
 * was retired upstream in ffdb40e. Proxied from the public am32.ca endpoint so
 * this route keeps working without any object-store credentials.
 * See server/api/files.ts for the full background.
 */
// The explicit return type matters: this route is itself called '/eeprom', so
// an unannotated $fetch to the same path makes Nitro's typed-route inference
// recurse into this handler's own type (TS7022 / TS2321 under vue-tsc).
export default defineEventHandler(async (event): Promise<unknown> => {
    const origin = useRuntimeConfig(event).filesOrigin.replace(/\/+$/, '');

    try {
        return await $fetch<unknown>(`${origin}/eeprom`);
    } catch (e) {
        throw createError({
            statusCode: 404,
            statusMessage: 'schema not found'
        });
    }
});
