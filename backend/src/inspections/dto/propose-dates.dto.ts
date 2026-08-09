import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString } from 'class-validator';

export class ProposeDatesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Proponga al menos una fecha' })
  @ArrayMaxSize(3, { message: 'Máximo 3 fechas propuestas' })
  @IsDateString({}, { each: true, message: 'Cada fecha debe ser una fecha-hora ISO válida' })
  dates!: string[];
}
