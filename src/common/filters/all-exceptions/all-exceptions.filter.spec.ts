import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ProblemException } from '@app/common/problems/problem.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

const mockLogger = { error: vi.fn() };

const mockResponse = {
  status: vi.fn().mockReturnThis(),
  type: vi.fn().mockReturnThis(),
  json: vi.fn(),
};

const mockRequest = { path: '/v1/auth/register', id: 'request-id' };

const host = {
  switchToHttp: () => ({
    getRequest: () => mockRequest,
    getResponse: () => mockResponse,
  }),
} as unknown as ArgumentsHost;

const occurrence = { instance: '/v1/auth/register', requestId: 'request-id' };

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter(mockLogger as unknown as PinoLogger);
    vi.clearAllMocks();
  });

  /** Runs the filter and returns the status and the body it answered with */
  function answer(exception: unknown) {
    filter.catch(exception, host);

    return {
      status: mockResponse.status.mock.calls[0][0] as number,
      body: mockResponse.json.mock.calls[0][0] as Record<string, unknown>,
    };
  }

  it('should answer with the problem+json content type', () => {
    answer(new NotFoundException());

    expect(mockResponse.type).toHaveBeenCalledWith('application/problem+json');
  });

  it('should leave out requestId when the request has no id', () => {
    const requestWithoutId = { path: '/v1/auth/login' };
    const hostWithoutId = {
      switchToHttp: () => ({
        getRequest: () => requestWithoutId,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException(), hostWithoutId);

    expect(mockResponse.json.mock.calls[0][0]).not.toHaveProperty('requestId');
  });

  describe('ProblemException', () => {
    it('should answer with its type, status and title', () => {
      const { status, body } = answer(new ProblemException('email-in-use'));

      expect(status).toBe(409);
      expect(body).toEqual({
        type: 'https://api.roobra.com/problems/email-in-use',
        title: 'Email already in use',
        status: 409,
        ...occurrence,
      });
    });

    it('should answer with its detail and field errors', () => {
      const errors = [{ field: 'email', messages: ['email must be an email'] }];

      const { body } = answer(
        new ProblemException(
          'validation-failed',
          'The request has 1 invalid field.',
          errors,
        ),
      );

      expect(body).toMatchObject({
        type: 'https://api.roobra.com/problems/validation-failed',
        status: 400,
        detail: 'The request has 1 invalid field.',
        errors,
      });
    });
  });

  describe('HttpException', () => {
    it('should answer as about:blank with its status and message', () => {
      const { status, body } = answer(
        new NotFoundException('No valid refresh tokens found for the user'),
      );

      expect(status).toBe(404);
      expect(body).toEqual({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'No valid refresh tokens found for the user',
        ...occurrence,
      });
    });

    it('should leave out a detail that only repeats the title', () => {
      const { body } = answer(new UnauthorizedException());

      expect(body).not.toHaveProperty('detail');
    });

    it('should keep the status of a custom HttpException', () => {
      const { status, body } = answer(new HttpException('Slow down', 429));

      expect(status).toBe(429);
      expect(body).toMatchObject({ title: 'Too Many Requests' });
    });

    it('should not log a client error', () => {
      answer(new BadRequestException());

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('client errors raised by Express', () => {
    it('should answer with the status of an exposed client error', () => {
      const error = Object.assign(new SyntaxError('Unexpected token b'), {
        status: 400,
        expose: true,
      });

      const { status, body } = answer(error);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        type: 'about:blank',
        title: 'Bad Request',
        detail: 'Unexpected token b',
      });
    });

    it('should answer 500 for an error whose message is not exposed', () => {
      const error = Object.assign(new Error('internal'), {
        status: 400,
        expose: false,
      });

      expect(answer(error).status).toBe(500);
    });
  });

  describe('Prisma errors no service handled', () => {
    it('should answer 409 to a unique constraint violation', () => {
      const { status, body } = answer({ code: 'P2002', meta: {} });

      expect(status).toBe(409);
      expect(body).toEqual({
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        ...occurrence,
      });
    });

    it('should answer 404 to a missing record', () => {
      expect(answer({ code: 'P2025' }).status).toBe(404);
    });
  });

  describe('unknown errors', () => {
    it('should answer 500 without any detail of the error', () => {
      const { status, body } = answer(new Error('connection string leaked'));

      expect(status).toBe(500);
      expect(body).toEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        ...occurrence,
      });
    });

    it('should log the error with its stack', () => {
      const error = new Error('boom');

      answer(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error },
        'Unhandled exception',
      );
    });
  });
});
