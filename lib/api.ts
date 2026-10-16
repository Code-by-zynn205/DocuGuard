/**
 * lib/api.ts
 *
 * Lớp trừu tượng để gọi API backend.
 *
 * MỤC ĐÍCH:
 * - Tập trung baseURL và headers vào 1 nơi.
 * - Xử lý lỗi nhất quán.
 * - Dễ mock khi viết test.
 *
 * CÁCH DÙNG TRONG COMPONENT:
 * import { apiClient } from '@/lib/api';
 * const data = await apiClient.get('/health');
 *
 * PHÂN BIỆT:
 * - NEXT_PUBLIC_API_URL: URL backend truy cập từ browser (client-side)
 *   → Ví dụ: http://localhost:3001  (khi dev local)
 * - Khi chạy trong Docker, container backend là "docuguard-server"
 *   nhưng browser vẫn dùng localhost hoặc IP host
 *
 * XEM THÊM: docs/FRONTEND_GUIDE.md
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Kiểu dữ liệu response chuẩn từ backend DocuGuard.
 * Backend trả về: { success: boolean, data: T, timestamp: string }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Kiểu dữ liệu response lỗi từ backend.
 * Backend trả về: { success: false, statusCode: number, message: string, ... }
 */
export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Lớp lỗi tùy chỉnh để phân biệt lỗi API với lỗi network.
 */
export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

/**
 * Hàm fetch wrapper — xử lý lỗi và parse JSON.
 * Dùng nội bộ, không export trực tiếp.
 */
async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}/api${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await response.json();

  if (!response.ok) {
    const error = json as ApiError;
    throw new ApiException(error.statusCode, error.message);
  }

  return json as ApiResponse<T>;
}

/**
 * apiClient — dùng trong mọi component và page của DocuGuard.
 *
 * VÍ DỤ:
 * // Lấy danh sách tài liệu
 * const result = await apiClient.get<Document[]>('/documents');
 * console.log(result.data); // Document[]
 *
 * // Tạo tài liệu mới
 * await apiClient.post('/documents', { title: 'Hợp đồng A' });
 */
export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
