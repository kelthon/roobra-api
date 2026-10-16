import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RAW_RESPONSE_KEY } from '@app/common/decorators/response/raw-response.decorator.js';
import { isRecord } from '@app/common/utils/type-guard/type-guard.util.js';
import {
  DataResponse,
  PagedResponse,
} from '@app/interfaces/paged-response.interface.js';
import { PaginationMeta } from '@app/types/pagination-meta.type.js';

const PAGINATION_TYPES = new Set<unknown>([
  'page',
  'cursor',
] satisfies PaginationMeta['paginationType'][]);

/**
 * Wraps what a route returns in `{ data }`. A paged response, already
 * `{ data, meta }`, an empty body (a 204) and a file are sent as they are,
 * and so is every route marked `@RawResponse()`. An error never reaches this
 * interceptor: `AllExceptionsFilter` answers it as problem details.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (raw) {
      return next.handle();
    }

    return next.handle().pipe(map((body: unknown) => wrap(body)));
  }
}

function wrap(
  body: unknown,
): DataResponse<unknown> | PagedResponse | StreamableFile | undefined {
  if (
    body === undefined ||
    body instanceof StreamableFile ||
    isPagedResponse(body)
  ) {
    return body;
  }

  return { data: body };
}

/**
 * Tells a paged response from a resource by its shape: a `data` list and a
 * `meta` with a `paginationType`.
 *
 * @param body What the route returned
 */
export function isPagedResponse(body: unknown): body is PagedResponse {
  return (
    isRecord(body) &&
    Array.isArray(body.data) &&
    isRecord(body.meta) &&
    PAGINATION_TYPES.has(body.meta.paginationType)
  );
}
