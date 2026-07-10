import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export function IsNotBlank(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    Transform(({ value }: TransformFnParams) => {
      if (typeof value === 'string') return value.trim();
      return value;
    })(object, propertyName);

    registerDecorator({
      name: 'isNotBlank',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not be blank`;
        },
      },
    });
  };
}
