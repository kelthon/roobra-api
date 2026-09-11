import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { PasswordHashService } from './password-hash.service';
import { AccessTokenService } from './access-token.service';
import { SimpleHashService } from 'src/common/services/simple-hash.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let prismaMock: PrismaService;
  let hashServiceMock: PasswordHashService;
  let accessTokenServiceMock: AccessTokenService;
  let simpleHashServiceMock: SimpleHashService;
  let authService: AuthService;

  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    hashServiceMock = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as PasswordHashService;

    accessTokenServiceMock = {
      generate: jest.fn().mockResolvedValue(tokens),
      refresh: jest.fn(),
      revoke: jest.fn(),
      revokeAll: jest.fn(),
    } as unknown as AccessTokenService;

    simpleHashServiceMock = {
      hash: jest.fn((raw: string) => `hashed(${raw})`),
      verify: jest.fn(),
    } as unknown as SimpleHashService;

    authService = new AuthService(
      prismaMock,
      hashServiceMock,
      accessTokenServiceMock,
      simpleHashServiceMock,
    );
  });

  describe('getMe', () => {
    it('should return the user profile for a given id', async () => {
      const profile = {
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      };
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(
        profile,
      );

      const result = await authService.getMe('user-id');

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id', deletedAt: null },
        }),
      );
      expect(result).toBe(profile);
    });

    it('should throw BadRequestException if no user is found', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(authService.getMe('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return the auth payload for valid credentials', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
        hashedPassword: 'hashed-password',
      });
      (hashServiceMock.verify as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser(
        'john.doe@example.com',
        'Password123!',
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'john.doe@example.com', deletedAt: null },
        }),
      );
      expect(result).toEqual({
        sub: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
      });
    });

    it('should return null when no user is found for the email', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateUser(
        'missing@example.com',
        'Password123!',
      );

      expect(result).toBeNull();
      expect(hashServiceMock.verify).not.toHaveBeenCalled();
    });

    it('should return null for an invalid password', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        hashedPassword: 'hashed-password',
      });
      (hashServiceMock.verify as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser(
        'john.doe@example.com',
        'WrongPassword123!',
      );

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const dto = {
      username: 'john.doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('should create the user, issue tokens and return the public profile', async () => {
      const createdUser = {
        id: 'user-id',
        email: dto.email,
        username: dto.username,
        role: 'SUBSCRIBER',
        photoUrl: null,
      };
      (hashServiceMock.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await authService.register(dto);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            username: dto.username,
            hashedPassword: 'hashed-password',
          }),
        }),
      );
      expect(accessTokenServiceMock.generate).toHaveBeenCalledWith(createdUser);
      // role is fetched for token generation but stripped from the public response
      const { role: _role, ...publicUser } = createdUser;
      expect(result).toEqual({ ...tokens, user: publicUser });
    });

    it('should throw BadRequestException when the email is already in use', async () => {
      (hashServiceMock.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(authService.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when the username is already in use', async () => {
      (hashServiceMock.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['username'] },
      });

      await expect(authService.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should issue tokens for the already-authenticated user id', async () => {
      const user = {
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
        photoUrl: null,
      };
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(user);

      const result = await authService.login('user-id');

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id', deletedAt: null },
        }),
      );
      expect(accessTokenServiceMock.generate).toHaveBeenCalledWith(user);
      // role is fetched for token generation but stripped from the public response
      const { role: _role, ...publicUser } = user;
      expect(result).toEqual({ ...tokens, user: publicUser });
    });

    it('should throw BadRequestException if the user no longer exists', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(authService.login('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the given refresh token for the user', async () => {
      (accessTokenServiceMock.revoke as jest.Mock).mockResolvedValue({
        message: 'Refresh token revoked successfully',
      });

      const result = await authService.logout('user-id', {
        refreshToken: 'refresh-token',
      });

      expect(accessTokenServiceMock.revoke).toHaveBeenCalledWith(
        'user-id',
        'refresh-token',
      );
      expect(result).toEqual({
        message: 'Refresh token revoked successfully',
      });
    });
  });

  describe('logoutAllSessions', () => {
    it('should revoke every refresh token for the user', async () => {
      (accessTokenServiceMock.revokeAll as jest.Mock).mockResolvedValue({
        message: 'All refresh tokens revoked successfully',
      });

      const result = await authService.logoutAllSessions('user-id');

      expect(accessTokenServiceMock.revokeAll).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        message: 'All refresh tokens revoked successfully',
      });
    });
  });

  describe('refreshSession', () => {
    it('should delegate straight to accessTokenService.refresh using the raw token', async () => {
      (accessTokenServiceMock.refresh as jest.Mock).mockResolvedValue(tokens);

      const result = await authService.refreshSession({
        refreshToken: 'refresh-token',
      });

      expect(accessTokenServiceMock.refresh).toHaveBeenCalledWith(
        'refresh-token',
      );
      expect(result).toBe(tokens);
    });
  });

  describe('forgotPassword', () => {
    it('should return a generic confirmation message when the user exists', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: 'user-id',
      });

      const result = await authService.forgotPassword({
        email: 'john.doe@example.com',
      });

      expect(result).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should throw BadRequestException when no user is found for the email', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        authService.forgotPassword({ email: 'missing@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should hash the reset token before looking it up, mark it used and update the password', async () => {
      (
        prismaMock.passwordResetToken.findUniqueOrThrow as jest.Mock
      ).mockResolvedValue({
        id: 'reset-token-id',
        userId: 'user-id',
      });
      (hashServiceMock.hash as jest.Mock).mockResolvedValue(
        'new-hashed-password',
      );
      (prismaMock.user.update as jest.Mock).mockResolvedValue({
        id: 'user-id',
      });

      await authService.resetPassword({
        resetToken: 'raw-reset-token',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      });

      expect(simpleHashServiceMock.hash).toHaveBeenCalledWith(
        'raw-reset-token',
      );
      expect(
        prismaMock.passwordResetToken.findUniqueOrThrow,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hashedToken: 'hashed(raw-reset-token)',
            usedAt: null,
          }),
        }),
      );
      expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reset-token-id' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: { hashedPassword: 'new-hashed-password' },
        }),
      );
    });

    it('should throw BadRequestException for an invalid, used or expired reset token', async () => {
      (
        prismaMock.passwordResetToken.findUniqueOrThrow as jest.Mock
      ).mockRejectedValue({ code: 'P2025' });

      await expect(
        authService.resetPassword({
          resetToken: 'invalid-token',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should update the password when the current password is correct', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        hashedPassword: 'old-hashed-password',
      });
      (hashServiceMock.verify as jest.Mock).mockResolvedValue(true);
      (hashServiceMock.hash as jest.Mock).mockResolvedValue(
        'new-hashed-password',
      );
      (prismaMock.user.update as jest.Mock).mockResolvedValue({
        id: 'user-id',
      });

      await authService.changePassword('user-id', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(hashServiceMock.verify).toHaveBeenCalledWith(
        'OldPassword123!',
        'old-hashed-password',
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id' },
          data: { hashedPassword: 'new-hashed-password' },
        }),
      );
    });

    it('should throw BadRequestException when the current password is wrong', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        hashedPassword: 'old-hashed-password',
      });
      (hashServiceMock.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword('user-id', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the user no longer exists', async () => {
      (prismaMock.user.findUniqueOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        authService.changePassword('missing-id', {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
