import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../domain/ports/payment-repository.port';
import { Payment } from '../../domain/entities/payment.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class PaymentRepositoryImpl extends PaymentRepository {
  private store = new Map<string, Payment>();

  async findAll(query?: PaginationDto): Promise<PaginatedResult<Payment>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const all = Array.from(this.store.values());
    const start = (page - 1) * limit;
    return new PaginatedResult(
      all.slice(start, start + limit),
      all.length,
      page,
      limit,
    );
  }

  async findById(id: string): Promise<Payment | null> {
    return this.store.get(id) ?? null;
  }

  async save(entity: Payment): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
