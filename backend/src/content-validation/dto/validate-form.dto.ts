import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Campos del paso 3 que se validan sin crear expediente. */
export class ValidateFormDto {
  @IsOptional()
  @IsString()
  direccionExacta?: string;

  @IsString()
  @IsNotEmpty()
  zona!: string;

  @IsString()
  @IsNotEmpty()
  nitPropietario!: string;

  @IsOptional()
  @IsString()
  finca?: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsOptional()
  @IsString()
  libro?: string;
}
