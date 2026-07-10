import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/ports/user-repository.port';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class UserUsecase {
  constructor(private readonly repo: UserRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const entity = User.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      preference: dto.preference,
    });
    await this.repo.save(entity);
    return entity;
  }

  findAll(query?: PaginationDto) {
    return this.repo.findAll(query);
  }

  async findById(id: string): Promise<User> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(`User not found`);
    return entity;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(`User not found`);
    entity.update({
      ...(dto.name && { name: dto.name }),
      ...(dto.email && { email: dto.email }),
      ...(dto.password && { password: dto.password }),
      ...(dto.preference && { preference: dto.preference }),
    });
    await this.repo.save(entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
