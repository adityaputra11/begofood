import { IsString, IsOptional } from 'class-validator';
import { IsNotBlank } from '../../../common/decorators/is-not-blank.decorator';

export class CreatePaymentDto {
  @IsNotBlank()
  name!: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
