#!/bin/bash
set -e

MODULE=$1
if [ -z "$MODULE" ]; then
  echo "usage: npm run hexagonal -- <module-name>"
  exit 1
fi

BASE="src/$MODULE"
CLASS="$(echo "${MODULE:0:1}" | tr '[:lower:]' '[:upper:]')${MODULE:1}"

mkdir -p "$BASE/domain/entities" "$BASE/domain/ports" \
  "$BASE/application/usecases" "$BASE/application/dtos" \
  "$BASE/infrastructure/controllers" "$BASE/infrastructure/persistence"

# ───────────────────── DOMAIN LAYER ─────────────────────

if [ ! -f "$BASE/domain/entities/$MODULE.entity.ts" ]; then
  cat > "$BASE/domain/entities/$MODULE.entity.ts" <<EOF
export type ${CLASS}Props = {
  name: string;
};

export class $CLASS {
  private constructor(
    public readonly id: string,
    private props: ${CLASS}Props,
    private readonly _createdAt: Date,
  ) {}

  static create(props: ${CLASS}Props): $CLASS {
    return new $CLASS(crypto.randomUUID(), props, new Date());
  }

  static hydrate(props: ${CLASS}Props & { id: string; createdAt: Date }): $CLASS {
    return new $CLASS(props.id, props, props.createdAt);
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  update(props: Partial<${CLASS}Props>): void {
    this.props = { ...this.props, ...props };
  }

  toJSON(): ${CLASS}Props & { id: string; createdAt: Date } {
    return { ...this.props, id: this.id, createdAt: this._createdAt };
  }
}
EOF
fi

if [ ! -f "$BASE/domain/ports/$MODULE-repository.port.ts" ]; then
  cat > "$BASE/domain/ports/$MODULE-repository.port.ts" <<EOF
import { $CLASS } from '../entities/$MODULE.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

export abstract class ${CLASS}Repository {
  abstract findAll(query?: PaginationDto): Promise<PaginatedResult<$CLASS>>;
  abstract findById(id: string): Promise<$CLASS | null>;
  abstract save(entity: $CLASS): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
EOF
fi

# ───────────────────── APPLICATION LAYER ─────────────────────

if [ ! -f "$BASE/application/dtos/create-$MODULE.dto.ts" ]; then
  cat > "$BASE/application/dtos/create-$MODULE.dto.ts" <<EOF
import { IsString, IsOptional } from 'class-validator';
import { IsNotBlank } from '../../../common/decorators/is-not-blank.decorator';

export class Create${CLASS}Dto {
  @IsNotBlank()
  name!: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
EOF
fi

if [ ! -f "$BASE/application/dtos/update-$MODULE.dto.ts" ]; then
  cat > "$BASE/application/dtos/update-$MODULE.dto.ts" <<EOF
import { PartialType } from '@nestjs/mapped-types';
import { Create${CLASS}Dto } from './create-$MODULE.dto';

export class Update${CLASS}Dto extends PartialType(Create${CLASS}Dto) {}
EOF
fi

if [ ! -f "$BASE/application/usecases/$MODULE.usecase.ts" ]; then
  cat > "$BASE/application/usecases/$MODULE.usecase.ts" <<EOF
import { Injectable, NotFoundException } from '@nestjs/common';
import { ${CLASS}Repository } from '../../domain/ports/$MODULE-repository.port';
import { $CLASS } from '../../domain/entities/$MODULE.entity';
import { Create${CLASS}Dto } from '../dtos/create-$MODULE.dto';
import { Update${CLASS}Dto } from '../dtos/update-$MODULE.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class ${CLASS}Usecase {
  constructor(private readonly repo: ${CLASS}Repository) {}

  async create(dto: Create${CLASS}Dto): Promise<$CLASS> {
    const entity = $CLASS.create({ name: dto.name });
    await this.repo.save(entity);
    return entity;
  }

  findAll(query?: PaginationDto) {
    return this.repo.findAll(query);
  }

  async findById(id: string): Promise<$CLASS> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(\`${CLASS} not found\`);
    return entity;
  }

  async update(id: string, dto: Update${CLASS}Dto): Promise<$CLASS> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException(\`${CLASS} not found\`);
    if (dto.name) entity.update({ name: dto.name });
    await this.repo.save(entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
EOF
fi

# ───────────────────── INFRASTRUCTURE LAYER ─────────────────────

if [ ! -f "$BASE/infrastructure/controllers/$MODULE.controller.ts" ]; then
  cat > "$BASE/infrastructure/controllers/$MODULE.controller.ts" <<EOF
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
import { ${CLASS}Usecase } from '../../application/usecases/$MODULE.usecase';
import { Create${CLASS}Dto } from '../../application/dtos/create-$MODULE.dto';
import { Update${CLASS}Dto } from '../../application/dtos/update-$MODULE.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Controller('$MODULE')
export class ${CLASS}Controller {
  constructor(private readonly usecase: ${CLASS}Usecase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: Create${CLASS}Dto) {
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
  update(@Param('id') id: string, @Body() dto: Update${CLASS}Dto) {
    return this.usecase.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.usecase.delete(id);
  }
}
EOF
fi

if [ ! -f "$BASE/infrastructure/persistence/$MODULE-repository.ts" ]; then
  cat > "$BASE/infrastructure/persistence/$MODULE-repository.ts" <<EOF
import { Injectable } from '@nestjs/common';
import { ${CLASS}Repository } from '../../domain/ports/$MODULE-repository.port';
import { $CLASS } from '../../domain/entities/$MODULE.entity';
import { PaginatedResult } from '../../../common/types/pagination.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';

@Injectable()
export class ${CLASS}RepositoryImpl extends ${CLASS}Repository {
  private store = new Map<string, $CLASS>();

  async findAll(query?: PaginationDto): Promise<PaginatedResult<$CLASS>> {
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

  async findById(id: string): Promise<$CLASS | null> {
    return this.store.get(id) ?? null;
  }

  async save(entity: $CLASS): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
EOF
fi

# ───────────────────── MODULE ─────────────────────

cat > "$BASE/$MODULE.module.ts" <<EOF
import { Module } from '@nestjs/common';
import { ${CLASS}Controller } from './infrastructure/controllers/$MODULE.controller';
import { ${CLASS}Usecase } from './application/usecases/$MODULE.usecase';
import { ${CLASS}Repository } from './domain/ports/$MODULE-repository.port';
import { ${CLASS}RepositoryImpl } from './infrastructure/persistence/$MODULE-repository';

@Module({
  controllers: [${CLASS}Controller],
  providers: [
    ${CLASS}Usecase,
    { provide: ${CLASS}Repository, useClass: ${CLASS}RepositoryImpl },
  ],
  exports: [${CLASS}Repository],
})
export class ${CLASS}Module {}
EOF

echo "hexagonal '$MODULE' created:"
find "$BASE" -type f | sort
