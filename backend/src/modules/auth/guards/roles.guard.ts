/**
 * roles.guard.ts
 *
 * Guard kiểm tra Role-Based Access Control (RBAC).
 *
 * CÁCH DÙNG:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Delete('/documents/:id')
 * deleteDocument(...) { ... }
 *
 * Phân cấp quyền:
 * - viewer   : Chỉ xem
 * - reviewer : Xem + xử lý sự cố
 * - admin    : Toàn quyền
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách roles được phép từ decorator @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có @Roles decorator → route public (hoặc chỉ cần JWT)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Lấy user từ request (đã được JwtAuthGuard gắn vào trước đó)
    const { user } = context.switchToHttp().getRequest<{ user: { role: string } }>();

    if (!user?.role) {
      throw new ForbiddenException('Không có quyền truy cập.');
    }

    const hasPermission = requiredRoles.includes(user.role);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Chức năng này yêu cầu quyền: [${requiredRoles.join(', ')}]. Bạn đang là: ${user.role}.`,
      );
    }

    return true;
  }
}
