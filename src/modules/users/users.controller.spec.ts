import { Test, TestingModule } from '@nestjs/testing';
import { type UserDto } from '@app/common/dto/user-dto.js';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth/jwt-auth.guard.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

const mockUsersService = {
  getMe: vi.fn(),
  delete: vi.fn(),
};

const mockUser: UserDto = {
  id: 'user-id',
  email: 'user@test.com',
  username: 'username',
  role: 'SUBSCRIBER',
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    vi.clearAllMocks();
  });

  describe('Guards', () => {
    it.each(['getMe', 'delete'])(
      'should apply JwtAuthGuard to %s',
      (methodName) => {
        const guards = Reflect.getMetadata(
          '__guards__',
          UsersController.prototype[methodName as keyof UsersController],
        );
        expect(guards).toContain(JwtAuthGuard);
      },
    );
  });

  describe('getMe', () => {
    it('should call usersService.getMe with the user id and return the result', async () => {
      const serviceResult = { id: mockUser.id, email: mockUser.email };
      mockUsersService.getMe.mockResolvedValue(serviceResult);

      const result = await controller.getMe(mockUser);

      expect(mockUsersService.getMe).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBe(serviceResult);
    });
  });

  describe('delete', () => {
    it('should call usersService.delete with the user id', async () => {
      mockUsersService.delete.mockResolvedValue(undefined);

      await controller.delete(mockUser);

      expect(mockUsersService.delete).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
