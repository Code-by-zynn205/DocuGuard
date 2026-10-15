/**
 * roles.decorator.ts
 *
 * Custom decorator @Roles() để đánh dấu route yêu cầu role cụ thể.
 *
 * CÁCH DÙNG:
 * @Roles('admin')               // Chỉ admin
 * @Roles('admin', 'reviewer')   // Admin hoặc reviewer
 *
 * KẾT HỢP VỚI:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
