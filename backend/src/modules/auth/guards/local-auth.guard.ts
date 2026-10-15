/**
 * local-auth.guard.ts
 *
 * Guard bảo vệ endpoint đăng nhập — kích hoạt LocalStrategy.
 *
 * DÙNG TẠI: POST /api/auth/login
 * Passport sẽ tự gọi LocalStrategy.validate(email, password).
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
