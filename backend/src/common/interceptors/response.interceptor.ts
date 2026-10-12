/**
 * response.interceptor.ts
 *
 * Interceptor bọc tất cả response thành công theo chuẩn thống nhất.
 *
 * RESPONSE THÀNH CÔNG SẼ CÓ DẠNG:
 * {
 *   "success": true,
 *   "data": { ... },       ← kết quả từ controller/service
 *   "timestamp": "..."
 * }
 *
 * CÁCH ĐĂNG KÝ TOÀN CỤC (trong main.ts):
 * app.useGlobalInterceptors(new ResponseInterceptor());
 *
 * LƯU Ý:
 * Interceptor chỉ bọc response thành công.
 * Lỗi được xử lý bởi HttpExceptionFilter.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
