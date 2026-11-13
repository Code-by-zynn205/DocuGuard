/**
 * auth.dto.ts
 *
 * Data Transfer Objects cho luồng xác thực DocuGuard.
 *
 * CÁC DTO:
 * - LoginDto       : Email + Password để đăng nhập
 * - RegisterDto    : Đăng ký tài khoản mới (Admin dùng)
 * - RefreshTokenDto: Làm mới access token bằng refresh token
 */

// ────────────────────────────────────────────────────
// LoginDto — POST /api/auth/login
// ────────────────────────────────────────────────────
export class LoginDto {
  /** Email đăng nhập (lowercase, trim tự động ở DB) */
  email!: string;

  /** Mật khẩu gốc (sẽ được so khớp với bcrypt hash trong DB) */
  password!: string;
}

// ────────────────────────────────────────────────────
// RegisterDto — POST /api/auth/register
// ────────────────────────────────────────────────────
export class RegisterDto {
  /** Email phải là duy nhất trong hệ thống */
  email!: string;

  /** Mật khẩu tối thiểu 8 ký tự */
  password!: string;

  /** Họ tên đầy đủ */
  fullName!: string;

  /** Phòng ban (không bắt buộc) */
  department?: string;

  /**
   * Vai trò: 'admin' | 'reviewer' | 'viewer'
   * Mặc định: 'viewer' (xem user.schema.ts)
   */
  role?: string;
}

// ────────────────────────────────────────────────────
// RefreshTokenDto — POST /api/auth/refresh
// ────────────────────────────────────────────────────
export class RefreshTokenDto {
  /** Refresh token nhận được khi đăng nhập */
  refreshToken!: string;
}

// ────────────────────────────────────────────────────
// JwtPayload — Payload được mã hoá trong JWT Access Token
// ────────────────────────────────────────────────────
export interface JwtPayload {
  /** MongoDB ObjectId dạng string */
  sub: string;
  /** Email người dùng */
  email: string;
  /** Vai trò: admin | reviewer | viewer */
  role: string;
  /** Loại token: 'access' | 'refresh' */
  type: 'access' | 'refresh';
}

// ────────────────────────────────────────────────────
// AuthResponseDto — Response trả về sau khi đăng nhập thành công
// ────────────────────────────────────────────────────
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // giây
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    department?: string;
    isActive: boolean;
  };
}
