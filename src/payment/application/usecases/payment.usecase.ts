import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../../domain/ports/payment-repository.port';
import { Payment } from '../../domain/entities/payment.entity';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { UpdatePaymentDto } from '../dtos/update-payment.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class PaymentUsecase {
  constructor(private readonly repo: PaymentRepository) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const entity = Payment.create({ name: dto.name });
    await this.repo.save(entity);
    return entity;
  }

  findAll(query?: PaginationDto) {
    return this.repo.findAll(query);
  }

  async findById(id: string): Promise<Payment> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(`Payment not found`);
    return entity;
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(`Payment not found`);
    if (dto.name) entity.update({ name: dto.name });
    await this.repo.save(entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
