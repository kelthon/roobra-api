import { FieldError } from '@app/interfaces/problem.interface.js';
import { PROBLEM_TYPES, ProblemType } from '@app/types/problem.type.js';
import { HttpException } from '@nestjs/common';

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
