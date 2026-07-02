/** Paginated list response returned by all ops list endpoints. */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
