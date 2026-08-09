import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Llega por multipart/form-data junto con la foto de evidencia. */
export class InspectionResultDto {
  @IsIn(['CONFORME', 'NO_CONFORME'], {
    message: 'El resultado debe ser CONFORME o NO_CONFORME',
  })
  result!: 'CONFORME' | 'NO_CONFORME';

  @IsString()
  @IsNotEmpty({ message: 'La nota descriptiva del resultado es obligatoria' })
  @MinLength(5)
  note!: string;
}
