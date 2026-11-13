/**
 * auth.module.ts
 *
 * Module tập hợp toàn bộ thành phần xác thực của DocuGuard.
 *
 * THÀNH PHẦN:
 * - PassportModule   : Kích hoạt Passport.js
 * - JwtModule        : Cấu hình ký/xác thực JWT Access Token
 * - LocalStrategy    : Xác thực email/password khi đăng nhập
 * - JwtStrategy      : Xác thực Bearer Token trên các API protected
 * - AuthService      : Logic nghiệp vụ xác thực
 * - AuthController   : Định tuyến HTTP
 *
 * LƯU Ý:
 * - DatabaseModule (@Global) đã export MongooseModule → AuthModule
 *   có thể dùng @InjectModel() mà không cần import lại MongooseModule.
 * - JwtStrategy cần appConfig.jwtSecret để verify token.
 *   Secret này PHẢI khớp với secret dùng trong JwtModule.register().
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { appConfig } from '../../config/app.config.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Module({
  imports: [
    // Khai báo strategy mặc định (dùng khi không truyền tên vào AuthGuard())
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Cấu hình JWT cho Access Token
    // AuthService tự truyền secret + expiresIn khi signAsync() nên không cần khai báo ở đây
    JwtModule.register({
      secret: appConfig.jwtSecret,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    // Export để các module khác (Documents, Incidents...) có thể
    // dùng JwtAuthGuard và RolesGuard mà không cần import lại AuthModule
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
