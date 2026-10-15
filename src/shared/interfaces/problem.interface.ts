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
