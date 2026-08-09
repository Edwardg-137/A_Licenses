import { IsUUID } from 'class-validator';

export class AssignReviewerDto {
  @IsUUID('4', { message: 'El revisor indicado no es válido' })
  reviewerId!: string;
}
