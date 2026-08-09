import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ProfessionalCollege } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName!: string;

  @IsEnum(ProfessionalCollege, { message: 'El colegio debe ser CIG o CAG' })
  collegeType!: ProfessionalCollege;

  @IsString()
  @IsNotEmpty({ message: 'El número de colegiado es obligatorio' })
  collegeNumber!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
