import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

export const USOS_INMUEBLE = ['RESIDENCIAL', 'MIXTO', 'COMERCIAL', 'INDUSTRIAL'] as const;
export type UsoInmuebleDto = (typeof USOS_INMUEBLE)[number];

/** Datos del proyecto (F08 / F02). Campos extra de F02 son opcionales en el DTO y se exigen en servicio según clasificación. */
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

  @IsIn(USOS_INMUEBLE, {
    message: 'El uso debe ser RESIDENCIAL, MIXTO, COMERCIAL o INDUSTRIAL',
  })
  uso!: UsoInmuebleDto;

  @IsOptional()
  @IsBoolean()
  centroHistorico?: boolean;

  /** Si es true, un proyecto residencial sale de F08 y entra a F02 (cambio de uso). */
  @IsOptional()
  @IsBoolean()
  cambioUsoSuelo?: boolean;

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

  /** Presupuesto estimado de obra en quetzales (documento D-12); alimenta la fórmula de la tasa. */
  @IsOptional()
  @IsNumber({}, { message: 'El presupuesto estimado debe ser numérico' })
  @Min(0, { message: 'El presupuesto estimado no puede ser negativo' })
  presupuestoEstimadoQ?: number;

  // ── Campos F02 (y opcionales útiles en F08) ──

  @IsOptional()
  @IsNumber({}, { message: 'El área del terreno debe ser numérica' })
  @Min(0)
  areaTerrenoM2?: number;

  @IsOptional()
  @IsString()
  descripcionTrabajos?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  tiempoEjecucionAnios?: number;

  @IsOptional()
  @IsBoolean()
  talaArboles?: boolean;

  @IsOptional()
  @IsString()
  talaMotivo?: string;

  @IsOptional()
  @IsIn(['NONE', 'SIMPLE', 'COMPLETO'])
  informeIndustrial?: 'NONE' | 'SIMPLE' | 'COMPLETO';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  obraTipos?: string[];

  @IsOptional()
  @IsBoolean()
  aceptaConfidencialidadCom21?: boolean;
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
