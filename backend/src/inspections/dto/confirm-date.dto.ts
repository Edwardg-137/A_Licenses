import { IsDateString } from 'class-validator';

export class ConfirmDateDto {
  @IsDateString({}, { message: 'La fecha debe ser una fecha-hora ISO válida' })
  date!: string;
}
