import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/** Creación de usuarios internos por el Admin: Revisor o Inspector. */
export class CreateInternalUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName!: string;

  @IsIn(['REVISOR', 'INSPECTOR'], { message: 'El rol debe ser REVISOR o INSPECTOR' })
  role!: 'REVISOR' | 'INSPECTOR';

  @IsOptional()
  @IsString()
  phone?: string;
}
