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
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
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
