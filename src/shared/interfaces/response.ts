export interface APIResponse<T = unknown> {
  statusCode: number;
  status:
    | 'bad_request'
    | 'conflict'
    | 'error'
    | 'forbidden'
    | 'not_found'
    | 'success'
    | 'token_expired'
    | 'unauthorized'
    | 'warning';
  data?: T;
  message?: string;
  metadata?:
    | {
        paginationType: 'page';
        page: number;
        limit: number;
        totalPages: number;
        totalItems: number;
        nextPage?: string;
        previousPage?: string;
      }
    | {
        paginationType: 'cursor';
        cursor: string;
        hasNext: boolean;
        nextCursor?: string;
      };
  errors?: {
    type: string;
    message: string;
    field?: string;
    code?: string | number;
  }[];
}
