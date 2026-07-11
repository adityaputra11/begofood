import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { UserRepository } from '../../domain/ports/user-repository.port';
import { User } from '../../domain/entities/user.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class UserPrismaRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(query?: PaginationDto): Promise<PaginatedResult<User>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ skip, take: limit }),
      this.prisma.user.count(),
    ]);
    return new PaginatedResult(
      records.map((r) => User.hydrate({ ...r })),
      total,
      page,
      limit,
    );
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return User.hydrate({ ...record });
  }

  async save(entity: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        password: entity.password,
        preference: entity.preference,
      },
      update: {
        name: entity.name,
        email: entity.email,
        preference: entity.preference,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
