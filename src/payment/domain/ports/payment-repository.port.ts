import { Payment } from '../entities/payment.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

export abstract class PaymentRepository {
  abstract findAll(query?: PaginationDto): Promise<PaginatedResult<Payment>>;
  abstract findById(id: string): Promise<Payment | null>;
  abstract save(entity: Payment): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
