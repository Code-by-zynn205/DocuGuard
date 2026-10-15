/**
 * local.strategy.ts
 *
 * Passport Local Strategy — dùng cho bước xác thực Username/Password
 * tại endpoint POST /api/auth/login.
 *
 * Flow:
 * 1. Client gửi { email, password }
 * 2. Passport gọi validate() với email và password
 * 3. Service kiểm tra user tồn tại + so khớp bcrypt hash
 * 4. Nếu hợp lệ: trả về user object (không có password)
 * 5. Nếu không hợp lệ: ném UnauthorizedException
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // Mặc định passport-local dùng field "username"
      // Override thành "email" cho phù hợp với hệ thống DocuGuard
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    return user;
  }
}
