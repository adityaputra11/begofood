import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentUsecase } from '../../application/usecases/payment.usecase';
import { CreatePaymentDto } from '../../application/dtos/create-payment.dto';
import { UpdatePaymentDto } from '../../application/dtos/update-payment.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Controller('payment')
export class PaymentController {
  constructor(private readonly usecase: PaymentUsecase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePaymentDto) {
    return this.usecase.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.usecase.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usecase.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.usecase.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.usecase.delete(id);
  }
}
