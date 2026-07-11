import { User } from '../entities/user.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

export abstract class UserRepository {
  abstract findAll(query?: PaginationDto): Promise<PaginatedResult<User>>;
  abstract findById(id: string): Promise<User | null>;
  abstract save(entity: User): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
