import { Module } from '@nestjs/common';
import { UserController } from './infrastructure/controllers/user.controller';
import { UserUsecase } from './application/usecases/user.usecase';
import { UserRepository } from './domain/ports/user-repository.port';
import { UserPrismaRepository } from './infrastructure/persistence/user-prisma.repository';

@Module({
  controllers: [UserController],
  providers: [
    UserUsecase,
    { provide: UserRepository, useClass: UserPrismaRepository },
  ],
  exports: [UserRepository],
})
export class UserModule {}
