import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'El dictamen de rechazo debe tener al menos 20 caracteres' })
  dictamen!: string;
}
