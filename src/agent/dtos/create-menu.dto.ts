import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
