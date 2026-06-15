export interface ApiResponse<T = unknown> {
  code: number;
  status: 'success' | 'fail' | 'error';
  message: string;
  data: T | null;
}
