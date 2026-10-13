import { HttpException, HttpStatus } from '@nestjs/common';

/** Prefix of every problem type URI (RFC 9457 section 3.1.1) */
export const PROBLEM_TYPE_BASE = 'https://api.roobra.com/problems/';

/**
 * The errors a client tells apart by `type`, with the status and title each
 * one is answered with. Any other error is answered as `about:blank`.
 */
export const PROBLEM_TYPES = {
  'validation-failed': {
    status: HttpStatus.BAD_REQUEST,
    title: 'Validation failed',
  },
  'email-in-use': {
    status: HttpStatus.CONFLICT,
    title: 'Email already in use',
  },
  'username-in-use': {
    status: HttpStatus.CONFLICT,
    title: 'Username already in use',
  },
  'invalid-credentials': {
    status: HttpStatus.UNAUTHORIZED,
    title: 'Invalid credentials',
  },
  'invalid-token': {
    status: HttpStatus.BAD_REQUEST,
    title: 'Invalid or expired token',
  },
  'incorrect-password': {
    status: HttpStatus.BAD_REQUEST,
    title: 'Incorrect password',
  },
} as const satisfies Record<string, { status: HttpStatus; title: string }>;

export type ProblemType = keyof typeof PROBLEM_TYPES;

/** A request field that failed validation, with every rule it broke */
export interface FieldError {
  /** The field's path, `email` or `address.zip` for a nested field */
  field: string;
  messages: string[];
}

/** An error response body (RFC 9457) */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  /**
   * The request id, also in the `X-Request-Id` response header. Missing when
   * the request failed before it got one, as a malformed JSON body does.
   */
  requestId?: string;
  errors?: FieldError[];
}

/**
 * An HTTP error a client tells apart by its problem type. The status and the
 * title come from `PROBLEM_TYPES`.
 */
export class ProblemException extends HttpException {
  /**
   * @param type The problem type, a key of `PROBLEM_TYPES`
   * @param detail What went wrong in this occurrence; the title when omitted
   * @param errors The fields that failed validation
   */
  constructor(
    readonly type: ProblemType,
    detail?: string,
    readonly errors?: FieldError[],
  ) {
    super(detail ?? PROBLEM_TYPES[type].title, PROBLEM_TYPES[type].status);
  }
}
