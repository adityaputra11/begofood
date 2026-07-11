import { Module } from '@nestjs/common';
import { PaymentController } from './infrastructure/controllers/payment.controller';
import { PaymentUsecase } from './application/usecases/payment.usecase';
import { PaymentRepository } from './domain/ports/payment-repository.port';
import { PaymentRepositoryImpl } from './infrastructure/persistence/payment-repository';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentUsecase,
    { provide: PaymentRepository, useClass: PaymentRepositoryImpl },
  ],
  exports: [PaymentRepository],
})
export class PaymentModule {}
