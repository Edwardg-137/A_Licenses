import { IsEnum, IsNotEmpty, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { DocumentReviewStatus, ObservationPriority } from '@prisma/client';

export class ReviewDocumentDto {
  @IsUUID('4')
  documentId!: string;

  @IsEnum(DocumentReviewStatus, {
    message: 'El estado debe ser CONFORME, CON_OBSERVACION o REQUIERE_REEMPLAZO',
  })
  reviewStatus!: DocumentReviewStatus;

  /** Obligatorio cuando el estado no es CONFORME. */
  @ValidateIf((dto: ReviewDocumentDto) => dto.reviewStatus !== 'CONFORME')
  @IsString()
  @IsNotEmpty({ message: 'La observación requiere un texto descriptivo' })
  @MinLength(3)
  text?: string;

  /** Obligatorio cuando el estado no es CONFORME. */
  @ValidateIf((dto: ReviewDocumentDto) => dto.reviewStatus !== 'CONFORME')
  @IsEnum(ObservationPriority, { message: 'La prioridad debe ser ALTA, MEDIA o BAJA' })
  priority?: ObservationPriority;
}
