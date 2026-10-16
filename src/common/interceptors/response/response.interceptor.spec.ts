import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { RawResponse } from '@app/common/decorators/response/raw-response.decorator.js';
import { PagedResponse } from '@app/interfaces/paged-response.interface.js';
import {
  isPagedResponse,
  ResponseInterceptor,
} from './response.interceptor.js';

class PlainController {
  handle() {}
}

class RawHandlerController {
  @RawResponse()
  handle() {}
}

@RawResponse()
class RawController {
  handle() {}
}

const paged: PagedResponse<number> = {
  data: [1, 2],
  meta: {
    paginationType: 'page',
    page: 1,
    limit: 2,
    totalPages: 1,
    totalItems: 2,
  },
};

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor(new Reflector());

  /** Runs the interceptor on a route of the given controller */
  function respond(
    body: unknown,
    controller: new () => { handle: () => void } = PlainController,
  ) {
    const context = {
      getHandler: () => controller.prototype.handle,
      getClass: () => controller,
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of(body) };

    return firstValueFrom(interceptor.intercept(context, next));
  }

  it('should wrap a resource in data', async () => {
    await expect(respond({ id: '42' })).resolves.toEqual({
      data: { id: '42' },
    });
  });

  it('should wrap a list that is not paged in data', async () => {
    await expect(respond([1, 2])).resolves.toEqual({ data: [1, 2] });
  });

  it('should wrap falsy values in data', async () => {
    await expect(respond(null)).resolves.toEqual({ data: null });
    await expect(respond(0)).resolves.toEqual({ data: 0 });
  });

  it('should send a paged response as it is', async () => {
    await expect(respond(paged)).resolves.toBe(paged);
  });

  it('should leave an empty body empty', async () => {
    await expect(respond(undefined)).resolves.toBeUndefined();
  });

  it('should send a file as it is', async () => {
    const file = new StreamableFile(Buffer.from('file'));

    await expect(respond(file)).resolves.toBe(file);
  });

  it('should send the body as it is when the handler is @RawResponse()', async () => {
    await expect(
      respond({ status: 'ok' }, RawHandlerController),
    ).resolves.toEqual({ status: 'ok' });
  });

  it('should send the body as it is when the controller is @RawResponse()', async () => {
    await expect(respond({ status: 'ok' }, RawController)).resolves.toEqual({
      status: 'ok',
    });
  });
});

describe('isPagedResponse', () => {
  it('should accept a page and a cursor response', () => {
    expect(isPagedResponse(paged)).toBe(true);
    expect(
      isPagedResponse({
        data: [],
        meta: { paginationType: 'cursor', cursor: 'abc' },
      }),
    ).toBe(true);
  });

  it('should reject what has no data list or no pagination meta', () => {
    expect(isPagedResponse({ data: {}, meta: paged.meta })).toBe(false);
    expect(isPagedResponse({ data: [] })).toBe(false);
    expect(isPagedResponse({ data: [], meta: {} })).toBe(false);
    expect(
      isPagedResponse({ data: [], meta: { paginationType: 'other' } }),
    ).toBe(false);
    expect(isPagedResponse(null)).toBe(false);
  });
});
