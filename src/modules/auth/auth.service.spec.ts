import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  // Mocking PrismaService and HashService for testing
  let prismaMock: unknown;
  let hashServiceMock: unknown;
  let tokenServiceMock: unknown;
  let authService: AuthService;
  let configServiceMock: ConfigService;

  beforeEach(() => {
    // Setup code before each test runs, e.g., reset database state

    prismaMock = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    hashServiceMock = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as HashService;

    tokenServiceMock = {
      createAccessToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeUserRefreshTokens: jest.fn(),
    } as unknown as TokenService;

    configServiceMock = {
      get: jest.fn((key: string) => {
        const config = {
          'jwt.expiresIn': 3600,
          'refreshToken.length': 64,
          'refreshToken.expiresIn': 604800,
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    // Initialize AuthService with mocked dependencies
    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      hashServiceMock as unknown as HashService,
      tokenServiceMock as unknown as TokenService,
    );
  });

  describe('getMe', () => {
    it('should return current authed user data', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'jonh.doe',
        emailVerifiedAt: new Date('2026-10-18'),
        createdAt: new Date('2026-10-15'),
      });

      const user = await authService.getMe('user-id');

      expect(user).toMatchObject({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'jonh.doe',
        emailVerifiedAt: new Date('2026-10-18'),
        createdAt: new Date('2026-10-15'),
      });
    });

    it('should throw a BadRequestException for invalid user id', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.user.findUniqueOrThrow as jest.Mock).mockRejectedValue({
        code: 'P2025',
      });

      await expect(authService.getMe('invalid-user-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return a user for valid credentials', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        hashedPassword: 'hashed-password',
        createdAt: new Date(),
      });

      (hashService.verify as jest.Mock).mockResolvedValue(true);

      const user = await authService.validateUser(
        'john.doe@example.com',
        'user-password',
      );

      expect(user).not.toBeNull();
    });

    it('should return null for invalid password', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hash = hashServiceMock as unknown as HashService;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        hashedPassword: 'hashed-password',
        createdAt: new Date(),
      });

      (hash.verify as jest.Mock).mockResolvedValue(false);

      const user = await authService.validateUser(
        'valid-email@example.com',
        'wrong-password',
      );

      expect(user).toBeNull();
    });

    it('should return null for invalid email', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await authService.validateUser(
        'invalid-email@example.com',
        'some-password',
      );

      expect(user).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a user with valid data', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;
      const tokenService = tokenServiceMock as unknown as TokenService;

      const dto = {
        username: 'john.doe',
        email: 'johndoe@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      };

      (hashService.hash as jest.Mock).mockResolvedValue('hashed-password');

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        username: 'john.doe',
        email: 'johndoe@example.com',
        emailVerifiedAt: null,
        createdAt: new Date(),
      });

      (tokenService.createAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
      });

      const auth = await authService.register(dto);

      expect(auth).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
        user: {
          id: 'user-id',
          username: 'john.doe',
          email: 'johndoe@example.com',
          emailVerifiedAt: null,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException case email already in use', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;

      const dto = {
        username: 'john.doe',
        email: 'already-in-use@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      };

      (hashService.hash as jest.Mock).mockResolvedValue('hashed-password');

      (prisma.user.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: {
          target: 'email',
        },
      });

      await expect(authService.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException case username already in use', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;

      const dto = {
        username: 'already-in-use',
        email: 'john.doe@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      };

      (hashService.hash as jest.Mock).mockResolvedValue('hashed-password');

      (prisma.user.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: {
          target: 'username',
        },
      });

      await expect(authService.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;
      const tokenService = tokenServiceMock as unknown as TokenService;

      const dto = {
        email: 'john.doe@example.com',
        password: 'user-password',
      };

      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        hashedPassword: 'hashed-password',
        emailVerifiedAt: null,
        createdAt: new Date(),
      });

      (hashService.verify as jest.Mock).mockResolvedValue(true);

      (tokenService.createAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
      });

      const auth = await authService.login(dto);

      expect(auth).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
        user: {
          id: 'user-id',
          email: 'john.doe@example.com',
          username: 'john.doe',
          emailVerifiedAt: null,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException for invalid email', async () => {
      const prisma = prismaMock as unknown as PrismaService;

      const dto = {
        email: 'invalid-email@example.com',
        password: 'user-password',
      };

      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        code: 'P2025',
      });

      await expect(authService.login(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid password', async () => {
      const prisma = prismaMock as unknown as PrismaService;
      const hashService = hashServiceMock as unknown as HashService;

      const dto = {
        email: 'john.doe@example.com',
        password: 'invalid-password',
      };

      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
        user: {
          id: 'user-id',
          email: 'johndoe@example.com',
          username: 'john.doe',
          emailVerifiedAt: null,
          createdAt: expect.any(Date),
        },
      });

      (hashService.verify as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token for a user', async () => {
      const tokenService = tokenServiceMock as unknown as TokenService;
      const userId = 'user-id';
      const dto = {
        refreshToken: 'refresh-token',
      };

      (tokenService.refreshAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
        user: {
          id: 'user-id',
          email: 'john.doe@example.com',
          username: 'john.doe',
          hashedPassword: 'hashed-password',
          emailVerifiedAt: null,
          createdAt: new Date(),
        },
      });

      await expect(
        authService.refreshToken(userId, dto),
      ).resolves.toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 54000,
        user: {
          id: 'user-id',
          email: 'john.doe@example.com',
          username: 'john.doe',
          hashedPassword: 'hashed-password',
          emailVerifiedAt: null,
          createdAt: expect.any(Date),
        },
      });
    });
  });
});
