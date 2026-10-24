import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { DISPLAY_NAME_MAX_LENGTH } from './account.schema';

export class UpdateAccountDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, DISPLAY_NAME_MAX_LENGTH)
  displayName: string;
}
