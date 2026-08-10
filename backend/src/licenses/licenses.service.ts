import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { StorageService } from '../documents/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildLicensePdf } from './license-pdf';

@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  private publicAppUrl(): string {
    return (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  private async nextLicenseNumber(tenantSlug: string, year: number): Promise<string> {
    // Prefijo corto legible: guatemala → GT; otros tenants usan hasta 4 letras del slug
    const slugMap: Record<string, string> = { guatemala: 'GT' };
    const slug = (slugMap[tenantSlug] ?? tenantSlug.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 4) || 'XX';
    const prefix = `LC-${slug}-${year}-`;
    const last = await this.prisma.license.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
    if (!Number.isFinite(seq) || seq < 1) {
      return `${prefix}000001`;
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private assertCanViewLicense(user: AuthenticatedUser, applicantId: string) {
    const staff = ['REVISOR', 'ADMIN', 'SUPERADMIN', 'INSPECTOR'];
    if (user.id !== applicantId && !staff.includes(user.role)) {
      throw new ForbiddenException('No tiene acceso a esta licencia');
    }
  }

  private async loadApplicationForIssue(tenantId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        tenant: true,
        licenseType: true,
        applicant: true,
        payment: true,
        license: true,
      },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    return application;
  }

  /**
   * Emite la licencia oficial del expediente (PDF + QR + correlativo).
   * Idempotente: si ya existe, la devuelve sin regenerar.
   */
  async issueForApplication(issuer: AuthenticatedUser, applicationId: string) {
    const application = await this.loadApplicationForIssue(issuer.tenantId, applicationId);

    if (application.license) {
      return application.license;
    }

    const issuableStatuses = [
      'PENDIENTE_DE_PAGO',
      'LICENCIA_EMITIDA',
      'RECEPCION_DE_OBRA',
      'CERRADO',
    ] as const;
    if (!issuableStatuses.includes(application.status as (typeof issuableStatuses)[number])) {
      throw new BadRequestException(
        `No se puede emitir licencia en estado ${application.status}`,
      );
    }
    if (!application.payment) {
      throw new BadRequestException('No hay cobro registrado para este expediente');
    }
    // Durante confirm-payment el pago puede aún no tener confirmedAt en memoria
    // si se llama antes del refresh; tras la transacción sí lo tiene.
    if (!application.payment.confirmedAt && application.status !== 'PENDIENTE_DE_PAGO') {
      throw new BadRequestException('El pago debe estar confirmado antes de emitir la licencia');
    }

    const issuedAt = new Date();
    const validUntil = new Date(issuedAt);
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const formData = (application.formData ?? {}) as Record<string, string | number | boolean>;
    const year = issuedAt.getFullYear();
    const qrToken = randomUUID();
    const verifyUrl = `${this.publicAppUrl()}/verificar/${qrToken}`;

    let number = await this.nextLicenseNumber(application.tenant.slug, year);
    let pdfPath: string | null = null;
    let license = null;

    // Hasta 3 intentos ante colisión del correlativo
    for (let attempt = 0; attempt < 3; attempt++) {
      const pdf = await buildLicensePdf({
        number,
        tenantName: application.tenant.name,
        formCode: application.formCode,
        licenseTypeName: application.licenseType.name,
        applicantName: application.applicant.fullName,
        collegeType: application.applicant.collegeType,
        collegeNumber: application.applicant.collegeNumber,
        direccion: String(formData.direccionExacta ?? '—'),
        zona: String(formData.zona ?? '—'),
        areaM2: String(formData.areaConstruccionM2 ?? '—'),
        niveles: String(formData.niveles ?? '—'),
        uso: String(formData.uso ?? '—'),
        finca: String(formData.finca ?? '—'),
        folio: String(formData.folio ?? '—'),
        libro: String(formData.libro ?? '—'),
        nitPropietario: String(formData.nitPropietario ?? '—'),
        issuedAt,
        validUntil,
        verifyUrl,
        amountPaid: Number(application.payment?.amount ?? 0).toFixed(2),
      });

      pdfPath = await this.storage.save(
        application.tenantId,
        applicationId,
        pdf,
        `licencia-${number}.pdf`,
      );

      try {
        license = await this.prisma.license.create({
          data: {
            applicationId,
            number,
            qrToken,
            pdfPath,
            issuedAt,
            validUntil,
          },
        });
        break;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') {
          number = await this.nextLicenseNumber(application.tenant.slug, year);
          continue;
        }
        throw err;
      }
    }

    if (!license) {
      throw new BadRequestException('No se pudo asignar un número de licencia único');
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: application.tenantId,
        userId: issuer.id,
        applicationId,
        action: `Licencia emitida: ${license.number} (verificación ${qrToken.slice(0, 8)}…)`,
        fromStatus: application.status,
        toStatus: 'LICENCIA_EMITIDA',
      },
    });

    await this.notifications.notifyUser(
      application.applicantId,
      application.tenantId,
      'Licencia emitida',
      `Su licencia ${license.number} está lista para descargar. Vigente hasta ${validUntil.toLocaleDateString('es-GT')}.`,
      applicationId,
    );
    await this.notifications.notifyRole(
      application.tenantId,
      'ADMIN',
      'Licencia emitida',
      `Se emitió la licencia ${license.number} del expediente ${application.formCode} (${application.applicant.fullName}).`,
      applicationId,
    );

    return license;
  }

  /** Backfill: emite el PDF si el expediente ya está pagado pero sin registro License. */
  async issueIfMissing(user: AuthenticatedUser, applicationId: string) {
    return this.issueForApplication(user, applicationId);
  }

  async getForApplication(user: AuthenticatedUser, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId: user.tenantId },
      include: { license: true },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    this.assertCanViewLicense(user, application.applicantId);
    if (!application.license) {
      throw new NotFoundException('Este expediente aún no tiene licencia emitida');
    }
    return {
      ...application.license,
      verifyUrl: `${this.publicAppUrl()}/verificar/${application.license.qrToken}`,
    };
  }

  async getPdfForDownload(user: AuthenticatedUser, applicationId: string) {
    const meta = await this.getForApplication(user, applicationId);
    const stream = this.storage.openRead(meta.pdfPath);
    return {
      stream,
      fileName: `licencia-${meta.number}.pdf`,
      mimeType: 'application/pdf' as const,
    };
  }

  /** Verificación pública (sin autenticación) por token del QR. */
  async verifyPublic(token: string) {
    const license = await this.prisma.license.findUnique({
      where: { qrToken: token },
      include: {
        application: {
          include: {
            tenant: { select: { name: true, slug: true } },
            licenseType: { select: { code: true, name: true, formCode: true } },
            applicant: {
              select: { fullName: true, collegeType: true, collegeNumber: true },
            },
          },
        },
      },
    });
    if (!license) {
      throw new NotFoundException('Licencia no encontrada o token inválido');
    }

    const formData = (license.application.formData ?? {}) as Record<string, string | number>;
    const now = new Date();
    const valid =
      !license.validUntil || license.validUntil.getTime() >= now.getTime();

    return {
      valid,
      number: license.number,
      issuedAt: license.issuedAt,
      validUntil: license.validUntil,
      status: license.application.status,
      tenant: license.application.tenant.name,
      licenseType: {
        code: license.application.licenseType.code,
        name: license.application.licenseType.name,
        formCode: license.application.licenseType.formCode,
      },
      project: {
        direccionExacta: formData.direccionExacta ?? null,
        zona: formData.zona ?? null,
        areaConstruccionM2: formData.areaConstruccionM2 ?? null,
        niveles: formData.niveles ?? null,
        uso: formData.uso ?? null,
      },
      professional: {
        fullName: license.application.applicant.fullName,
        collegeType: license.application.applicant.collegeType,
        collegeNumber: license.application.applicant.collegeNumber,
      },
    };
  }
}
