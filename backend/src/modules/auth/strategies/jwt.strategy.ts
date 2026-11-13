/**
 * jwt.strategy.ts
 *
 * Passport JWT Strategy — dùng để bảo vệ các API cần đăng nhập.
 *
 * Flow:
 * 1. Client gửi request kèm Header: Authorization: Bearer <accessToken>
 * 2. Passport tự động extract token từ header
 * 3. Verify chữ ký JWT bằng JWT_SECRET
 * 4. Gọi validate() với payload đã giải mã
 * 5. Gắn user vào request.user cho controller dùng
 *
 * GUARD SỬ DỤNG: JwtAuthGuard (guards/jwt-auth.guard.ts)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { appConfig } from '../../../config/app.config.js';
import { User, UserDocument } from '../../../database/schemas/user.schema.js';
import type { JwtPayload } from '../dto/auth.dto.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      // Tự động extract Bearer token từ Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Từ chối token hết hạn — không tự gia hạn
      ignoreExpiration: false,
      secretOrKey: appConfig.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // Chỉ cho phép access token, không cho refresh token dùng ở đây
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token không hợp lệ.');
    }

    // Kiểm tra user vẫn còn active trong DB (tránh trường hợp token cũ sau khi bị khóa)
    const user = await this.userModel
      .findById(payload.sub)
      .select('-passwordHash -refreshTokenHash')
      .lean()
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    // Object này sẽ được gắn vào request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: user.fullName,
      department: user.department,
    };
  }
}
