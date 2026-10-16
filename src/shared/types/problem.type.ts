import { HttpStatus } from '@nestjs/common';

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
  'invalid-cursor': {
    status: HttpStatus.BAD_REQUEST,
    title: 'Invalid cursor',
  },
  'incorrect-password': {
    status: HttpStatus.BAD_REQUEST,
    title: 'Incorrect password',
  },
} as const satisfies Record<string, { status: HttpStatus; title: string }>;

export type ProblemType = keyof typeof PROBLEM_TYPES;
