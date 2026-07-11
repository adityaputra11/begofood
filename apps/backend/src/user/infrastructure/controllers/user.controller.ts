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
import { UserUsecase } from '../../application/usecases/user.usecase';
import { CreateUserDto } from '../../application/dtos/create-user.dto';
import { UpdateUserDto } from '../../application/dtos/update-user.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly usecase: UserUsecase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usecase.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.usecase.delete(id);
  }
}
