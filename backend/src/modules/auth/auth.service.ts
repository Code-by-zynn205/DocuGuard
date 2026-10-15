/**
 * auth.service.ts
 *
 * Service xử lý toàn bộ logic xác thực của DocuGuard:
 *
 * CHỨC NĂNG:
 * 1. validateUser()    — Kiểm tra email/password khi đăng nhập (dùng bởi LocalStrategy)
 * 2. login()           — Phát hành Access Token + Refresh Token sau khi xác thực thành công
 * 3. register()        — Tạo tài khoản mới (chỉ Admin)
 * 4. refreshTokens()   — Làm mới cặp token khi Access Token hết hạn
 * 5. logout()          — Xóa Refresh Token Hash trong DB (vô hiệu hóa refresh)
 * 6. getProfile()      — Lấy thông tin cá nhân user đang đăng nhập
 * 7. updateProfile()   — Cập nhật thông tin cá nhân (fullName, department, phone)
 * 8. changePassword()  — Đổi mật khẩu (yêu cầu mật khẩu cũ)
 * 9. getAllUsers()      — Lấy danh sách tất cả user (Admin only)
 * 10. toggleUserStatus() — Khóa/mở tài khoản (Admin only)
 *
 * BẢO MẬT:
 * - Password hash: bcrypt với saltRounds = 12
 * - Refresh Token hash: bcrypt với saltRounds = 10 (lưu vào DB)
 * - Access Token TTL: 15 phút (cấu hình qua JWT_ACCESS_EXPIRES_IN)
 * - Refresh Token TTL: 7 ngày (cấu hình qua JWT_REFRESH_EXPIRES_IN)
 * - Mỗi lần refresh sẽ phát hành cặp token mới (Rotation)
 *
 * AUDIT LOG:
 * - Ghi lại mọi sự kiện auth.login, auth.logout vào collection audit_logs
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema.js';
import { AuditLog, AuditLogDocument, AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { appConfig } from '../../config/app.config.js';
import type {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  JwtPayload,
  AuthResponseDto,
} from './dto/auth.dto.js';

// ────────────────────────────────────────────────────────────────
// Kiểu user đã xác thực (không có hash) — trả ra từ validateUser
// ────────────────────────────────────────────────────────────────
export interface ValidatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  isActive: boolean;
}

// ────────────────────────────────────────────────────────────────
// Metadata request (IP, UserAgent) dùng để ghi Audit Log
// ────────────────────────────────────────────────────────────────
export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // bcrypt salt rounds
  private readonly PASSWORD_SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_SALT_ROUNDS = 10;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // 1. validateUser — Dùng bởi LocalStrategy
  // ──────────────────────────────────────────────────────────────
  async validateUser(email: string, password: string): Promise<ValidatedUser | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();

    if (!user) return null;

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    // Trả về user object không có password hash
    return {
      id: (user._id as { toString(): string }).toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 2. login — Phát hành Access + Refresh Token
  // ──────────────────────────────────────────────────────────────
  async login(user: ValidatedUser, meta?: RequestMeta): Promise<AuthResponseDto> {
    const tokens = await this.generateTokenPair(user);

    // Lưu refresh token hash vào DB (để invalidate khi logout)
    await this.saveRefreshTokenHash(user.id, tokens.refreshToken);

    // Cập nhật lastLoginAt
    await this.userModel.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });

    // Ghi Audit Log
    await this.writeAuditLog({
      action: AuditAction.AUTH_LOGIN,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      meta,
      status: 'success',
      metadata: { fullName: user.fullName, loginAt: new Date().toISOString() },
    });

    this.logger.log(`✅ Đăng nhập thành công: ${user.email} [${user.role}]`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: appConfig.jwtAccessExpiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 3. register — Tạo tài khoản mới
  // ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string; userId: string }> {
    // Kiểm tra email trùng lặp
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" đã được sử dụng trong hệ thống.`);
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    const validatedRole: UserRole =
      dto.role && validRoles.includes(dto.role as UserRole)
        ? (dto.role as UserRole)
        : UserRole.VIEWER;

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.PASSWORD_SALT_ROUNDS);

    const created = await this.userModel.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      fullName: dto.fullName.trim(),
      department: dto.department?.trim(),
      role: validatedRole,
      isActive: true,
    });

    const newUser = created as UserDocument;
    const userId = (newUser._id as { toString(): string }).toString();
    this.logger.log(`🆕 Tạo tài khoản mới: ${newUser.email} [${validatedRole}]`);

    return { message: 'Tạo tài khoản thành công.', userId };
  }

  // ──────────────────────────────────────────────────────────────
  // 4. refreshTokens — Xoay vòng cặp token mới
  // ──────────────────────────────────────────────────────────────
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // Giải mã refresh token (sẽ throw nếu token hết hạn hoặc sai chữ ký)
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: appConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token không phải refresh token.');
    }

    // Tìm user và kiểm tra refresh token hash
    const user = await this.userModel
      .findById(payload.sub)
      .select('+refreshTokenHash')
      .exec();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    // So khớp hash
    const isRefreshTokenValid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!isRefreshTokenValid) {
      // Token rotation attack detected — xóa luôn refresh token
      await this.userModel.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
      throw new UnauthorizedException('Refresh token không hợp lệ. Vui lòng đăng nhập lại.');
    }

    // Phát hành cặp token mới
    const validatedUser: ValidatedUser = {
      id: (user._id as { toString(): string }).toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    };

    const tokens = await this.generateTokenPair(validatedUser);
    await this.saveRefreshTokenHash(validatedUser.id, tokens.refreshToken);

    this.logger.log(`🔄 Refresh token thành công: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: appConfig.jwtAccessExpiresInSeconds,
      user: {
        id: validatedUser.id,
        email: validatedUser.email,
        fullName: validatedUser.fullName,
        role: validatedUser.role,
        department: validatedUser.department,
        isActive: validatedUser.isActive,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 5. logout — Vô hiệu hóa Refresh Token trong DB
  // ──────────────────────────────────────────────────────────────
  async logout(userId: string, meta?: RequestMeta): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null });

    // Ghi Audit Log
    await this.writeAuditLog({
      action: AuditAction.AUTH_LOGOUT,
      entityType: AuditEntityType.USER,
      entityId: userId,
      userId,
      userEmail: user.email,
      userRole: user.role,
      meta,
      status: 'success',
      metadata: { logoutAt: new Date().toISOString() },
    });

    this.logger.log(`👋 Đăng xuất: ${user.email}`);
    return { message: 'Đăng xuất thành công.' };
  }

  // ──────────────────────────────────────────────────────────────
  // 6. getProfile — Lấy thông tin cá nhân user đang đăng nhập
  // ──────────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash -refreshTokenHash')
      .lean()
      .exec();

    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    return {
      id: (user._id as { toString(): string }).toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 7. updateProfile — Cập nhật thông tin cá nhân
  // ──────────────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    dto: { fullName?: string; department?: string; phone?: string },
  ) {
    const updates: Record<string, string | undefined> = {};
    if (dto.fullName) updates['fullName'] = dto.fullName.trim();
    if (dto.department !== undefined) updates['department'] = dto.department?.trim();
    if (dto.phone !== undefined) updates['phone'] = dto.phone?.trim();

    const user = await this.userModel
      .findByIdAndUpdate(userId, updates, { new: true })
      .select('-passwordHash -refreshTokenHash')
      .lean()
      .exec();

    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    return {
      id: (user._id as { toString(): string }).toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      phone: user.phone,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 8. changePassword — Đổi mật khẩu (yêu cầu mật khẩu cũ)
  // ──────────────────────────────────────────────────────────────
  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 8 ký tự.');
    }

    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, this.PASSWORD_SALT_ROUNDS);
    await this.userModel.findByIdAndUpdate(userId, {
      passwordHash: newHash,
      // Xóa refresh token để buộc đăng nhập lại trên tất cả thiết bị
      refreshTokenHash: null,
    });

    this.logger.log(`🔑 Đổi mật khẩu thành công: ${user.email}`);
    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  // ──────────────────────────────────────────────────────────────
  // 9. getAllUsers — Danh sách tất cả user (Admin only)
  // ──────────────────────────────────────────────────────────────
  async getAllUsers(query: { role?: string; isActive?: boolean; department?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.role) filter['role'] = query.role;
    if (query.isActive !== undefined) filter['isActive'] = query.isActive;
    if (query.department) filter['department'] = { $regex: query.department, $options: 'i' };

    const users = await this.userModel
      .find(filter)
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return users.map((u) => ({
      id: (u._id as { toString(): string }).toString(),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: (u as unknown as { createdAt: Date }).createdAt,
    }));
  }

  // ──────────────────────────────────────────────────────────────
  // 10. toggleUserStatus — Khóa/Mở tài khoản (Admin only)
  // ──────────────────────────────────────────────────────────────
  async toggleUserStatus(
    targetUserId: string,
    adminId: string,
  ): Promise<{ message: string; isActive: boolean }> {
    if (targetUserId === adminId) {
      throw new BadRequestException('Không thể tự khóa tài khoản của chính mình.');
    }

    const user = await this.userModel.findById(targetUserId);
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản.');

    const newStatus = !user.isActive;
    await this.userModel.findByIdAndUpdate(targetUserId, {
      isActive: newStatus,
      // Nếu bị khóa → xóa refresh token để kick out ngay lập tức
      ...(newStatus === false ? { refreshTokenHash: null } : {}),
    });

    const action = newStatus ? 'Kích hoạt' : 'Khóa';
    this.logger.log(`🔒 ${action} tài khoản: ${user.email} bởi Admin #${adminId}`);

    return {
      message: `${action} tài khoản "${user.email}" thành công.`,
      isActive: newStatus,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────

  /**
   * Tạo cặp Access Token + Refresh Token từ thông tin user.
   */
  private async generateTokenPair(user: ValidatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    const basePayload: Omit<JwtPayload, 'type'> = { sub: user.id, email: user.email, role: user.role };

    // expiresIn phải là số (giây) — parse từ chuỗi '15m' → 900s, '7d' → 604800s
    const parseExpiry = (val: string): number => {
      const num = parseInt(val, 10);
      if (val.endsWith('m')) return num * 60;
      if (val.endsWith('h')) return num * 3600;
      if (val.endsWith('d')) return num * 86400;
      return num; // đã là giây
    };

    const accessExpiresIn = parseExpiry(appConfig.jwtAccessExpiresIn);
    const refreshExpiresIn = parseExpiry(appConfig.jwtRefreshExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, type: 'access' as const },
        { secret: appConfig.jwtSecret, expiresIn: accessExpiresIn },
      ),
      this.jwtService.signAsync(
        { ...basePayload, type: 'refresh' as const },
        { secret: appConfig.jwtRefreshSecret, expiresIn: refreshExpiresIn },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Hash refresh token và lưu vào DB (không lưu plain text).
   */
  private async saveRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, this.REFRESH_TOKEN_SALT_ROUNDS);
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: hash });
  }

  /**
   * Ghi một dòng vào audit_logs.
   */
  private async writeAuditLog(params: {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    meta?: RequestMeta;
    status: 'success' | 'failure';
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditLogModel.create({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
        status: params.status,
        metadata: params.metadata ?? {},
      });
    } catch (err) {
      // Không để lỗi audit log làm crash luồng chính
      this.logger.error('Không thể ghi Audit Log:', err);
    }
  }
}
