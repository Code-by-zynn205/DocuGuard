/**
 * current-user.decorator.ts
 *
 * Decorator @CurrentUser() để lấy thông tin user đang đăng nhập
 * từ request (do JwtStrategy gắn vào sau khi verify JWT).
 *
 * CÁCH DÙNG TRONG CONTROLLER:
 *
 * @UseGuards(JwtAuthGuard)
 * @Get('/profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user; // { id, email, role, fullName, department }
 * }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  department?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
