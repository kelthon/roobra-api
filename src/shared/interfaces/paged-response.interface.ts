import { PageMeta } from '@app/types/pagination-meta.type.js';

export interface DataResponse<T> {
  data: T;
}

export interface PagedResponse<T = unknown> {
  data: T[];
  meta: PageMeta;
}
