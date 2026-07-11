import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  cluster?: string;

  @IsOptional()
  @IsString()
  restaurant?: string;
}
