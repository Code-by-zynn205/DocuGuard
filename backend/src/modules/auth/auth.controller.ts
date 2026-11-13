/**
 * auth.controller.ts
 *
 * Controller xử lý toàn bộ các endpoint xác thực của DocuGuard.
 *
 * ENDPOINTS:
 * ─────────────────────────────────────────────────────────────
 * POST   /api/auth/login              Đăng nhập → trả về JWT pair
 * POST   /api/auth/register           Đăng ký tài khoản mới (Admin only)
 * POST   /api/auth/refresh            Làm mới Access Token bằng Refresh Token
 * POST   /api/auth/logout             Đăng xuất (vô hiệu hóa Refresh Token)
 * GET    /api/auth/profile            Xem thông tin cá nhân
 * PATCH  /api/auth/profile            Cập nhật thông tin cá nhân
 * PATCH  /api/auth/change-password    Đổi mật khẩu
 * GET    /api/auth/users              Danh sách tất cả user (Admin only)
 * PATCH  /api/auth/users/:id/toggle   Khóa/Mở tài khoản (Admin only)
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { appConfig } from '../../config/app.config.js';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from './decorators/current-user.decorator.js';
import type { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto.js';
import type { ValidatedUser, RequestMeta } from './auth.service.js';

/** Helper: Lấy IP thực từ request (hỗ trợ reverse proxy X-Forwarded-For) */
function getClientMeta(req: ExpressRequest): RequestMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ??
    req.socket?.remoteAddress ??
    'unknown';

  return {
    ipAddress: ipAddress.trim(),
    userAgent: req.headers['user-agent'] ?? 'unknown',
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ────────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // LocalAuthGuard sẽ tự gọi LocalStrategy.validate() trước khi vào đây
  // Passport gắn user đã xác thực vào req.user
  // ────────────────────────────────────────────────────────────────
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: ExpressRequest & { user: ValidatedUser },
    @Body() _body: LoginDto, // Được xử lý bởi LocalStrategy, để đây cho tường minh
  ) {
    const meta = getClientMeta(req);
    return this.authService.login(req.user, meta);
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/auth/google — Chuyển hướng tới trang cấp quyền Google (Gmail + Drive)
  // ────────────────────────────────────────────────────────────────
  @Get('google')
  googleLogin(@Res() res: ExpressResponse) {
    if (!appConfig.googleClientId || !appConfig.googleClientSecret) {
      return res.redirect(`${appConfig.frontendOrigin}/login?googleError=missing_config`);
    }

    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/gmail.send',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: appConfig.googleClientId,
      redirect_uri: appConfig.googleRedirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/auth/google/callback — Nhận authorization code từ Google
  // ────────────────────────────────────────────────────────────────
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Request() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    if (error || !code) {
      return res.redirect(
        `${appConfig.frontendOrigin}/login?googleError=${encodeURIComponent(error || 'access_denied')}`,
      );
    }

    if (!appConfig.googleClientId || !appConfig.googleClientSecret) {
      return res.redirect(`${appConfig.frontendOrigin}/login?googleError=missing_config`);
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: appConfig.googleClientId,
          client_secret: appConfig.googleClientSecret,
          redirect_uri: appConfig.googleRedirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        return res.redirect(`${appConfig.frontendOrigin}/login?googleError=token_exchange_failed`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileRes.ok) {
        return res.redirect(`${appConfig.frontendOrigin}/login?googleError=userinfo_failed`);
      }

      const profile = (await profileRes.json()) as {
        id: string;
        email: string;
        name?: string;
        picture?: string;
      };

      const authResult = await this.authService.loginWithGoogle(
        {
          googleId: profile.id,
          email: profile.email,
          fullName: profile.name || profile.email,
          avatarUrl: profile.picture,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
        },
        getClientMeta(req),
      );

      const encoded = Buffer.from(JSON.stringify(authResult), 'utf-8').toString('base64url');
      return res.redirect(`${appConfig.frontendOrigin}/login#googleAuth=${encoded}`);
    } catch {
      return res.redirect(`${appConfig.frontendOrigin}/login?googleError=oauth_exception`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/auth/register
  // Chỉ Admin mới được tạo tài khoản mới
  // ────────────────────────────────────────────────────────────────
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/auth/refresh
  // Không cần guard vì refresh token chứa đủ thông tin để xác thực
  // ────────────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // ────────────────────────────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: ExpressRequest,
  ) {
    const meta = getClientMeta(req);
    return this.authService.logout(user.id, meta);
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/auth/profile
  // ────────────────────────────────────────────────────────────────
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  // ────────────────────────────────────────────────────────────────
  // PATCH /api/auth/profile
  // ────────────────────────────────────────────────────────────────
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { fullName?: string; department?: string; phone?: string },
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  // ────────────────────────────────────────────────────────────────
  // PATCH /api/auth/change-password
  // ────────────────────────────────────────────────────────────────
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/auth/users?role=admin&isActive=true&department=IT
  // Admin only
  // ────────────────────────────────────────────────────────────────
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('department') department?: string,
  ) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.authService.getAllUsers({ role, isActive: isActiveBool, department });
  }

  // ────────────────────────────────────────────────────────────────
  // PATCH /api/auth/users/:id/toggle
  // Admin only — Khóa/Mở tài khoản
  // ────────────────────────────────────────────────────────────────
  @Patch('users/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async toggleUserStatus(
    @Param('id') targetUserId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.authService.toggleUserStatus(targetUserId, admin.id);
  }
}
