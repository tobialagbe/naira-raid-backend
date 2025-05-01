import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly resetTokens: Map<string, { email: string; expires: Date }> = new Map();
  private readonly verificationTokens: Map<string, { email: string; expires: Date }> = new Map();
  private readonly refreshTokens: Map<string, { userId: string; expires: Date }> = new Map();

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser({ email, password }: { email: string; password: string }) {
    const user = await this.userService.findByEmail(email);
    // console.log(user);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
      isEmailVerified: false,
    });

    // Generate email verification token
    const verificationToken = uuidv4();
    this.verificationTokens.set(verificationToken, {
      email: user.email,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(user, verificationToken);

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    let user;
    if (loginDto.email) {
      user = await this.validateUser({
        email: loginDto.email,
        password: loginDto.password,
      });
    } else if (loginDto.username) {
      const userByUsername = await this.userService.findByUsername(loginDto.username);
      if (userByUsername) {
        user = await this.validateUser({
          email: userByUsername.email,
          password: loginDto.password,
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user._id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user._id.toString(),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const user = await this.userService.findByEmail(requestPasswordResetDto.email);
    if (!user) {
      throw new BadRequestException('No user found with this email');
    }

    const resetToken = uuidv4();
    this.resetTokens.set(resetToken, {
      email: user.email,
      expires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user, resetToken);

    return { message: 'Password reset instructions sent to your email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenData = this.resetTokens.get(resetPasswordDto.token);
    if (!tokenData || tokenData.expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userService.findByEmail(tokenData.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userService.update(user._id.toString(), { password: hashedPassword });

    // Remove used token
    this.resetTokens.delete(resetPasswordDto.token);

    return { message: 'Password successfully reset' };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const tokenData = this.verificationTokens.get(verifyEmailDto.token);
    if (!tokenData || tokenData.expires < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.userService.findByEmail(tokenData.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.userService.update(user._id.toString(), { isEmailVerified: true });

    // Remove used token
    this.verificationTokens.delete(verifyEmailDto.token);

    return { message: 'Email successfully verified' };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const tokenData = this.refreshTokens.get(refreshTokenDto.refreshToken);
    if (!tokenData || tokenData.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findById(tokenData.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const payload = { email: user.email, sub: user._id };
    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = uuidv4();

    // Store new refresh token and remove old one
    this.refreshTokens.delete(refreshTokenDto.refreshToken);
    this.refreshTokens.set(newRefreshToken, {
      userId: user._id.toString(),
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async checkAndRefreshToken(accessToken: string, refreshToken: string) {
    try {
      // Verify access token. If valid we simply return it.
      this.jwtService.verify(accessToken);
      return { access_token: accessToken };
    } catch (err) {
      // Access token invalid or expired. Attempt refresh.
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData || tokenData.expires < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = await this.userService.findById(tokenData.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const payload = { email: user.email, sub: user._id };
      const newAccessToken = this.jwtService.sign(payload);
      const newRefreshToken = uuidv4();

      // Replace old refresh token
      this.refreshTokens.delete(refreshToken);
      this.refreshTokens.set(newRefreshToken, {
        userId: user._id.toString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    }
  }
}
