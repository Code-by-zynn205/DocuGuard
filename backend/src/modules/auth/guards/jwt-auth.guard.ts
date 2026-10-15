/**
 * jwt-auth.guard.ts
 *
 * Guard bảo vệ các API cần xác thực JWT.
 *
 * CÁCH DÙNG TRÊN CONTROLLER:
 * @UseGuards(JwtAuthGuard)
 * @Get('/protected')
 * getProtectedData(@Request() req) {
 *   return req.user; // { id, email, role, fullName, department }
 * }
 *
 * CÁCH DÙNG GLOBAL (trong app.module.ts nếu muốn bảo vệ toàn bộ):
 * { provide: APP_GUARD, useClass: JwtAuthGuard }
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
