import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForbidAuthenticatedGuard } from './guards/forbid-authenticated.guard';
import { type UserDto } from 'src/common/dto/user-dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const mockAuthService = {
  getMe: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  logoutAllSessions: jest.fn(),
  refreshSession: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
};

const mockUser: UserDto = {
  id: 'user-id',
  email: 'user@test.com',
  username: 'username',
  role: 'SUBSCRIBER',
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('Guards', () => {
    describe('@UserOnly() routes', () => {
      it.each(['getMe', 'logout', 'logoutAllSessions', 'changePassword'])(
        'should apply JwtAuthGuard to %s',
        (methodName) => {
          const guards = Reflect.getMetadata(
            '__guards__',
            AuthController.prototype[methodName as keyof AuthController],
          );
          expect(guards).toContain(JwtAuthGuard);
        },
      );
    });

    describe('@GuestOnly() routes', () => {
      it.each(['register', 'login'])(
        'should apply ForbidAuthenticatedGuard to %s',
        (methodName) => {
          const guards = Reflect.getMetadata(
            '__guards__',
            AuthController.prototype[methodName as keyof AuthController],
          );
          expect(guards).toContain(ForbidAuthenticatedGuard);
        },
      );
    });

    describe('public routes', () => {
      it.each(['refreshSession', 'forgotPassword', 'resetPassword'])(
        'should apply no guard to %s',
        (methodName) => {
          const guards = Reflect.getMetadata(
            '__guards__',
            AuthController.prototype[methodName as keyof AuthController],
          );
          expect(guards).toBeUndefined();
        },
      );
    });

    it('should apply the local passport strategy guard to login', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        AuthController.prototype.login,
      );
      expect(guards).toContain(AuthGuard('local'));
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe with the user id and return the result', async () => {
      const serviceResult = { id: mockUser.id, email: mockUser.email };
      mockAuthService.getMe.mockResolvedValue(serviceResult);

      const result = await controller.getMe(mockUser);

      expect(mockAuthService.getMe).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBe(serviceResult);
    });
  });

  describe('register', () => {
    it('should call authService.register with the dto and return the result', async () => {
      const dto = {
        email: 'user@test.com',
        password: 'Password123!',
      } as RegisterUserDto;
      const serviceResult = { accessToken: 'token' };
      mockAuthService.register.mockResolvedValue(serviceResult);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('login', () => {
    it('should call authService.login with the already-authenticated user id', async () => {
      // credentials themselves are checked upstream by the local passport
      // guard/LocalStrategy before this handler ever runs
      const dto = {
        email: 'user@test.com',
        password: 'Password123!',
      } as LoginDto;
      const serviceResult = { accessToken: 'token' };
      mockAuthService.login.mockResolvedValue(serviceResult);

      const result = await controller.login(mockUser, dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBe(serviceResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the user id and dto, and return the result', async () => {
      const dto = { refreshToken: 'some-refresh-token' } as LogoutDto;
      const serviceResult = { message: 'Logged out' };
      mockAuthService.logout.mockResolvedValue(serviceResult);

      const result = await controller.logout(mockUser, dto);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('logoutAllSessions', () => {
    it('should call authService.logoutAllSessions with the user id and return the result', async () => {
      const serviceResult = { message: 'All sessions revoked' };
      mockAuthService.logoutAllSessions.mockResolvedValue(serviceResult);

      const result = await controller.logoutAllSessions(mockUser);

      expect(mockAuthService.logoutAllSessions).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toBe(serviceResult);
    });
  });

  describe('refreshSession', () => {
    it('should call authService.refreshSession with the dto and return the result (no user context)', async () => {
      const dto = { refreshToken: 'some-refresh-token' } as RefreshTokenDto;
      const serviceResult = { accessToken: 'new-access-token' };
      mockAuthService.refreshSession.mockResolvedValue(serviceResult);

      const result = await controller.refreshSession(dto);

      expect(mockAuthService.refreshSession).toHaveBeenCalledWith(dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with the dto and return the result', async () => {
      const dto = { email: 'user@test.com' } as ForgotPasswordDto;
      const serviceResult = { message: 'Email sent' };
      mockAuthService.forgotPassword.mockResolvedValue(serviceResult);

      const result = await controller.forgotPassword(dto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with the dto and return the result', async () => {
      const dto = {
        resetToken: 'reset-token',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      } as ResetPasswordDto;
      const serviceResult = { message: 'Password reset' };
      mockAuthService.resetPassword.mockResolvedValue(serviceResult);

      const result = await controller.resetPassword(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe(serviceResult);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with the user id and dto, and return the result', async () => {
      const dto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      } as ChangePasswordDto;
      const serviceResult = { message: 'Password changed' };
      mockAuthService.changePassword.mockResolvedValue(serviceResult);

      const result = await controller.changePassword(mockUser, dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
      expect(result).toBe(serviceResult);
    });
  });
});
