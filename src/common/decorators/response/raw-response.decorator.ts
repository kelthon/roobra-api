import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Sends what the route returns as is, without the `{ data }` envelope of
 * `ResponseInterceptor`. For a route whose format belongs to someone else,
 * such as the health check that monitors read. Applies to a handler or to a
 * whole controller.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
