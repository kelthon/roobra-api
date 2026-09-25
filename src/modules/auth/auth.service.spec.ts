import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from './auth.service.js';
import { PasswordHashService } from './services/password-hash/password-hash.service.js';
import { AccessTokenService } from './services/access-token/access-token.service.js';
import { SimpleHashService } from 'src/common/services/simple-hash/simple-hash.service.js';
import { BadRequestException } from '@nestjs/common';
import { SimpleTokenService } from 'src/common/services/simple-token/simple-token.service.js';
import { ConfigService } from '@nestjs/config';
import { PasswordResetMailService } from 'src/modules/notifications/services/password-reset-mail.service.js';
import { EmailVerificationMailService } from 'src/modules/notifications/services/email-verification-mail.service.js';
import type { Mock } from 'vitest';

describe('AuthService', () => {
  let prismaMock: PrismaService;
  let hashServiceMock: PasswordHashService;
  let accessTokenServiceMock: AccessTokenService;
  let simpleHashServiceMock: SimpleHashService;
  let simpleTokenServiceMock: SimpleTokenService;
  let configServiceMock: ConfigService;
  let passwordResetMailServiceMock: PasswordResetMailService;
  let emailVerificationMailServiceMock: EmailVerificationMailService;
  let authService: AuthService;

  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      passwordResetToken: {
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      emailVerificationToken: {
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      // Mirrors both Prisma `$transaction` call styles used by AuthService:
      // an interactive callback (register/resetPassword) and a batch of
      // promises (verifyEmail). The callback is handed `prismaMock` itself
      // so `tx.user.create(...)` etc. hit the same vi mocks as the rest
      // of the suite.
      $transaction: vi.fn((arg: unknown) =>
        typeof arg === 'function'
          ? arg(prismaMock)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    } as unknown as PrismaService;

    hashServiceMock = {
      hash: vi.fn(),
      verify: vi.fn(),
    } as unknown as PasswordHashService;

    accessTokenServiceMock = {
      generate: vi.fn().mockResolvedValue(tokens),
      refresh: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
    } as unknown as AccessTokenService;

    simpleHashServiceMock = {
      hash: vi.fn((raw: string) => `hashed(${raw})`),
      verify: vi.fn(),
    } as unknown as SimpleHashService;

    simpleTokenServiceMock = {
      generate: vi.fn((size?: number) => `${size}`),
    } as unknown as SimpleTokenService;

    configServiceMock = {
      getOrThrow: vi.fn((propertyPath: string) => {
        const values: Record<string, unknown> = {
          'passwordResetToken.length': 64,
          'passwordResetToken.expiresIn': 300,
          'emailVerificationToken.length': 64,
          'emailVerificationToken.expiresIn': 900,
        };
        return values[propertyPath];
      }),
    } as unknown as ConfigService;

    passwordResetMailServiceMock = {
      send: vi.fn(),
    } as unknown as PasswordResetMailService;

    emailVerificationMailServiceMock = {
      send: vi.fn(),
    } as unknown as EmailVerificationMailService;

    authService = new AuthService(
      prismaMock,
      hashServiceMock,
      accessTokenServiceMock,
      simpleHashServiceMock,
      simpleTokenServiceMock,
      configServiceMock,
      passwordResetMailServiceMock,
      emailVerificationMailServiceMock,
    );
  });

  describe('getMe', () => {
    it('should return the user profile for a given id', async () => {
      const profile = {
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      };
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue(profile);

      const result = await authService.getMe('user-id');

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id', deletedAt: null },
        }),
      );
      expect(result).toBe(profile);
    });

    it('should throw BadRequestException if no user is found', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(authService.getMe('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return the auth payload for valid credentials', async () => {
      (prismaMock.user.findUnique as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
        hashedPassword: 'hashed-password',
      });
      (hashServiceMock.verify as Mock).mockResolvedValue(true);

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
      (prismaMock.user.findUnique as Mock).mockResolvedValue(null);

      const result = await authService.validateUser(
        'missing@example.com',
        'Password123!',
      );

      expect(result).toBeNull();
      expect(hashServiceMock.verify).not.toHaveBeenCalled();
    });

    it('should return null for an invalid password', async () => {
      (prismaMock.user.findUnique as Mock).mockResolvedValue({
        id: 'user-id',
        hashedPassword: 'hashed-password',
      });
      (hashServiceMock.verify as Mock).mockResolvedValue(false);

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
      (hashServiceMock.hash as Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as Mock).mockResolvedValue(createdUser);

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
      // tokens must be generated inside the same transaction as user creation
      expect(accessTokenServiceMock.generate).toHaveBeenCalledWith(
        createdUser,
        expect.anything(),
      );
      // role is fetched for token generation but stripped from the public response
      const { role: _role, ...publicUser } = createdUser;
      expect(result).toEqual({ ...tokens, user: publicUser });
    });

    it('should throw BadRequestException when the email is already in use', async () => {
      (hashServiceMock.hash as Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(authService.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when the username is already in use', async () => {
      (hashServiceMock.hash as Mock).mockResolvedValue('hashed-password');
      (prismaMock.user.create as Mock).mockRejectedValue({
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
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue(user);

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
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(authService.login('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the given refresh token for the user', async () => {
      (accessTokenServiceMock.revoke as Mock).mockResolvedValue({
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
      (accessTokenServiceMock.revokeAll as Mock).mockResolvedValue({
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
      (accessTokenServiceMock.refresh as Mock).mockResolvedValue(tokens);

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
    it('should create a hashed reset token and return a generic confirmation message', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      });
      (prismaMock.passwordResetToken.create as Mock).mockResolvedValue({
        id: 'reset-token-id',
      });

      const result = await authService.forgotPassword({
        email: 'john.doe@example.com',
      });

      expect(simpleTokenServiceMock.generate).toHaveBeenCalledWith(64);
      expect(simpleHashServiceMock.hash).toHaveBeenCalledWith('64');
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hashedToken: 'hashed(64)',
            userId: 'user-id',
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(passwordResetMailServiceMock.send).toHaveBeenCalledWith(
        'john.doe@example.com',
        'john.doe',
        '64',
      );
      expect(result).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should answer exactly the same, and do nothing, when no account has the email', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValueOnce({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      });
      (prismaMock.passwordResetToken.create as Mock).mockResolvedValue({
        id: 'reset-token-id',
      });
      const forExistingAccount = await authService.forgotPassword({
        email: 'john.doe@example.com',
      });
      vi.clearAllMocks();

      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });
      const forMissingAccount = await authService.forgotPassword({
        email: 'missing@example.com',
      });

      expect(forMissingAccount).toEqual(forExistingAccount);
      expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
      expect(passwordResetMailServiceMock.send).not.toHaveBeenCalled();
    });

    it('should not recover a soft-deleted account', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await authService.forgotPassword({ email: 'deleted@example.com' });

      expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { email: 'deleted@example.com', deletedAt: null },
      });
    });

    it('should rethrow errors that are not "record not found"', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(
        authService.forgotPassword({ email: 'john.doe@example.com' }),
      ).rejects.toThrow('database unavailable');
    });
  });

  describe('resetPassword', () => {
    it('should hash the reset token before looking it up, mark it used and update the password', async () => {
      (
        prismaMock.passwordResetToken.findUniqueOrThrow as Mock
      ).mockResolvedValue({
        id: 'reset-token-id',
        userId: 'user-id',
      });
      (hashServiceMock.hash as Mock).mockResolvedValue('new-hashed-password');
      (prismaMock.user.update as Mock).mockResolvedValue({
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
        prismaMock.passwordResetToken.findUniqueOrThrow as Mock
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
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        hashedPassword: 'old-hashed-password',
      });
      (hashServiceMock.verify as Mock).mockResolvedValue(true);
      (hashServiceMock.hash as Mock).mockResolvedValue('new-hashed-password');
      (prismaMock.user.update as Mock).mockResolvedValue({
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
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        hashedPassword: 'old-hashed-password',
      });
      (hashServiceMock.verify as Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword('user-id', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the user no longer exists', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
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

  describe('sendVerificationEmail', () => {
    it('should create a hashed verification token and email it to the user', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      });
      (prismaMock.emailVerificationToken.create as Mock).mockResolvedValue({
        id: 'verification-token-id',
      });

      const result = await authService.sendVerificationEmail('user-id');

      expect(simpleTokenServiceMock.generate).toHaveBeenCalledWith(64);
      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-id',
            hashedToken: 'hashed(64)',
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(emailVerificationMailServiceMock.send).toHaveBeenCalledWith(
        'john.doe@example.com',
        'john.doe',
        '64',
        900,
      );
      expect(result).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should save the token before sending the email', async () => {
      const calls: string[] = [];
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      });
      (prismaMock.emailVerificationToken.create as Mock).mockImplementation(
        () => {
          calls.push('create');
          return Promise.resolve({ id: 'verification-token-id' });
        },
      );
      (emailVerificationMailServiceMock.send as Mock).mockImplementation(() => {
        calls.push('send');
        return Promise.resolve();
      });

      await authService.sendVerificationEmail('user-id');

      expect(calls).toEqual(['create', 'send']);
    });

    it('should not send the email when the token cannot be saved', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
      });
      (prismaMock.emailVerificationToken.create as Mock).mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(
        authService.sendVerificationEmail('user-id'),
      ).rejects.toThrow('database unavailable');

      expect(emailVerificationMailServiceMock.send).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the user no longer exists', async () => {
      (prismaMock.user.findUniqueOrThrow as Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(
        authService.sendVerificationEmail('missing-id'),
      ).rejects.toThrow(BadRequestException);

      expect(emailVerificationMailServiceMock.send).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should hash the token, mark it used and mark the user as verified', async () => {
      (
        prismaMock.emailVerificationToken.findUniqueOrThrow as Mock
      ).mockResolvedValue({
        id: 'verification-token-id',
        userId: 'user-id',
      });
      (prismaMock.user.update as Mock).mockResolvedValue({
        id: 'user-id',
      });
      (prismaMock.emailVerificationToken.update as Mock).mockResolvedValue({
        id: 'verification-token-id',
      });

      const result = await authService.verifyEmail('raw-verification-token');

      expect(simpleHashServiceMock.hash).toHaveBeenCalledWith(
        'raw-verification-token',
      );
      expect(
        prismaMock.emailVerificationToken.findUniqueOrThrow,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hashedToken: 'hashed(raw-verification-token)',
            usedAt: null,
          }),
        }),
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id', deletedAt: null },
          data: { emailVerifiedAt: expect.any(Date) },
        }),
      );
      expect(prismaMock.emailVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'verification-token-id' },
          data: { usedAt: expect.any(Date) },
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it('should throw BadRequestException for an invalid, used or expired verification token', async () => {
      (
        prismaMock.emailVerificationToken.findUniqueOrThrow as Mock
      ).mockRejectedValue({ code: 'P2025' });

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});
