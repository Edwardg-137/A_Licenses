import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  collegeType: true,
  collegeNumber: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, filters: { role?: UserRole; status?: UserStatus }) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        ...(filters.role ? { role: filters.role } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInternal(tenantId: string, dto: CreateInternalUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        status: 'ACTIVE', // los usuarios internos los crea el Admin ya activos
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  /** Aprueba la cuenta de un Solicitante en PENDING_APPROVAL (decisión D-005). */
  async approve(tenantId: string, userId: string) {
    const user = await this.findInTenant(tenantId, userId);
    if (user.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('La cuenta no está pendiente de aprobación');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async setActive(tenantId: string, userId: string, active: boolean) {
    const user = await this.findInTenant(tenantId, userId);
    if (user.role === 'ADMIN' && !active) {
      throw new BadRequestException('No se puede desactivar una cuenta de Administrador');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: active ? 'ACTIVE' : 'DISABLED' },
      select: PUBLIC_USER_SELECT,
    });
  }

  private async findInTenant(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
