import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /** Tenant único del MVP; en fases multi-municipio vendrá del subdominio o del request. */
  private async getDefaultTenant() {
    const slug = process.env.DEFAULT_TENANT_SLUG ?? 'guatemala';
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new UnauthorizedException(
        'Tenant por defecto no configurado. Ejecutar el seed de base de datos.',
      );
    }
    return tenant;
  }

  /**
   * Registro de Solicitante (profesional colegiado).
   * La cuenta queda PENDING_APPROVAL hasta que el Admin la apruebe (decisión D-005).
   */
  async register(dto: RegisterDto) {
    const tenant = await this.getDefaultTenant();

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo electrónico');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'SOLICITANTE',
        status: 'PENDING_APPROVAL',
        collegeType: dto.collegeType,
        collegeNumber: dto.collegeNumber,
      },
    });

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      message:
        'Registro recibido. Su cuenta será revisada y aprobada por el Administrador Municipal antes de poder ingresar.',
    };
  }

  async login(dto: LoginDto) {
    const tenant = await this.getDefaultTenant();
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    if (user.status === 'PENDING_APPROVAL') {
      throw new ForbiddenException(
        'Su cuenta aún está pendiente de aprobación por el Administrador Municipal.',
      );
    }
    if (user.status === 'DISABLED') {
      throw new ForbiddenException('Su cuenta está desactivada.');
    }

    return this.issueTokens(user.id, user.tenantId, user.role, user.email, {
      fullName: user.fullName,
    });
  }

  async refresh(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada. Inicie sesión nuevamente.');
    }
    if (stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Rotación: se revoca el token usado y se emite uno nuevo
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.tenantId,
      stored.user.role,
      stored.user.email,
      { fullName: stored.user.fullName },
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Sesión cerrada' };
  }

  private async issueTokens(
    userId: string,
    tenantId: string,
    role: string,
    email: string,
    extra: { fullName: string },
  ) {
    const payload: JwtPayload = { sub: userId, tenantId, role, email };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = randomBytes(48).toString('hex');
    const days = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 7);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role, fullName: extra.fullName },
    };
  }
}
