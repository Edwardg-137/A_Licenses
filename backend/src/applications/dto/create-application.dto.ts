import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Datos del proyecto según mvp_docs/04-tipos-licencia-y-requisitos.md §2.2 */
export class ProjectFormDataDto {
  @IsString()
  @IsNotEmpty({ message: 'La dirección exacta del inmueble es obligatoria' })
  direccionExacta!: string;

  @IsString()
  @IsNotEmpty({ message: 'La zona es obligatoria' })
  zona!: string;

  @IsNumber({}, { message: 'El área de construcción debe ser numérica' })
  @Min(1, { message: 'El área de construcción debe ser mayor a 0' })
  @Max(100000, { message: 'El área de construcción excede el máximo razonable' })
  areaConstruccionM2!: number;

  @IsInt({ message: 'El número de niveles debe ser un entero' })
  @Min(1)
  @Max(30)
  niveles!: number;

  @IsIn(['RESIDENCIAL', 'MIXTO'], { message: 'El uso debe ser RESIDENCIAL o MIXTO' })
  uso!: 'RESIDENCIAL' | 'MIXTO';

  @IsOptional()
  centroHistorico?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'El número de finca (RGP) es obligatorio' })
  finca!: string;

  @IsString()
  @IsNotEmpty({ message: 'El folio (RGP) es obligatorio' })
  folio!: string;

  @IsString()
  @IsNotEmpty({ message: 'El libro (RGP) es obligatorio' })
  libro!: string;

  @IsString()
  @IsNotEmpty({ message: 'El NIT del propietario es obligatorio' })
  nitPropietario!: string;
}

export class CreateApplicationDto {
  @IsUUID('4', { message: 'El tipo de licencia no es válido' })
  licenseTypeId!: string;

  @ValidateNested()
  @Type(() => ProjectFormDataDto)
  formData!: ProjectFormDataDto;
}

export class UpdateApplicationDto {
  @ValidateNested()
  @Type(() => ProjectFormDataDto)
  formData!: ProjectFormDataDto;
}
