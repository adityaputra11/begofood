import { IsEmail } from 'class-validator';
import { IsNotBlank } from '../../../common/decorators/is-not-blank.decorator';

export class CreateUserDto {
  @IsNotBlank()
  name!: string;

  @IsNotBlank()
  @IsEmail()
  email!: string;

  @IsNotBlank()
  password!: string;

  @IsNotBlank()
  preference!: string;
}
