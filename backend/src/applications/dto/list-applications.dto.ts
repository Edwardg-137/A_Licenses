import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class ListApplicationsDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  /** Filtro por fecha de creación (inclusive), formato ISO 8601 */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filtro por fecha de creación (inclusive), formato ISO 8601 */
  @IsOptional()
  @IsDateString()
  to?: string;
}
