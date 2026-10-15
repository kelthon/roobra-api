import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { STATUS_CODES } from 'node:http';
import {
  PROBLEM_TYPE_BASE,
  PROBLEM_TYPES,
  ProblemDetails,
  ProblemException,
} from '@app/common/problems/problem.js';
import {
  isRecordNotFoundError,
  isUniqueConstraintViolationError,
} from '@app/common/utils/database/database.util.js';

/**
 * Answers every error as RFC 9457 problem details
 * (`application/problem+json`), so clients read one format.
 *
 * A `ProblemException` gets its own problem type; any other error is
 * `about:blank`, titled with its status. An error that is neither an
 * `HttpException`, a client error raised by Express nor a known Prisma error
 * is a 500 without detail, logged with its stack.
 *
 * @see docs/reference/error-responses.md
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const problem = this.toProblem(exception, req);

    if (problem.status >= 500) {
      this.logger.error({ err: exception }, 'Unhandled exception');
    }

    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, req: Request): ProblemDetails {
    const occurrence = {
      // The path without the query string, which may carry a token
      instance: req.path,
      // Set by pino-http, which runs after Express's body parser: a malformed
      // body is rejected before the request gets an id
      ...(typeof req.id === 'string' && { requestId: req.id }),
    };

    if (exception instanceof ProblemException) {
      const { status, title } = PROBLEM_TYPES[exception.type];

      return {
        type: PROBLEM_TYPE_BASE + exception.type,
        title,
        status,
        ...this.detail(exception.message, title),
        ...(exception.errors && { errors: exception.errors }),
        ...occurrence,
      };
    }

    if (exception instanceof HttpException) {
      return this.blank(exception.getStatus(), occurrence, exception.message);
    }

    if (isClientError(exception)) {
      return this.blank(exception.status, occurrence, exception.message);
    }

    if (isUniqueConstraintViolationError(exception)) {
      return this.blank(HttpStatus.CONFLICT, occurrence);
    }

    if (isRecordNotFoundError(exception)) {
      return this.blank(HttpStatus.NOT_FOUND, occurrence);
    }

    return this.blank(HttpStatus.INTERNAL_SERVER_ERROR, occurrence);
  }

  /** A problem with no type of its own, titled with its status */
  private blank(
    status: number,
    occurrence: Pick<ProblemDetails, 'instance' | 'requestId'>,
    detail?: string,
  ): ProblemDetails {
    const title = STATUS_CODES[status] ?? 'Error';

    return {
      type: 'about:blank',
      title,
      status,
      ...this.detail(detail, title),
      ...occurrence,
    };
  }

  /** `detail` only when it adds something to the title */
  private detail(detail: string | undefined, title: string) {
    return detail && detail !== title ? { detail } : {};
  }
}

/**
 * A client error raised outside Nest's exceptions, such as a malformed JSON
 * body rejected by Express's body parser. These errors follow the
 * `http-errors` convention: a 4xx `status` and `expose: true` when the message
 * is safe to show.
 */
function isClientError(
  error: unknown,
): error is { status: number; message: string } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}
