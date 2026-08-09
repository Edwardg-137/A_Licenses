import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { StorageService } from '../documents/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildSimplePdf } from './receipt-pdf';

interface FeeFormula {
  base?: number;
  porcentajePresupuesto?: number;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** Tasa F08: base + % sobre presupuesto estimado de obra (fórmula configurable por licencia). */
  static calculateFee(feeFormula: Prisma.JsonValue, formData: Prisma.JsonValue) {
    const formula = (feeFormula ?? {}) as FeeFormula;
    const base = Number(formula.base ?? 0);
    const porcentaje = Number(formula.porcentajePresupuesto ?? 0);
    const presupuesto = Number((formData as Record<string, unknown>)?.presupuestoEstimadoQ ?? 0);
    const variable = Math.round(presupuesto * porcentaje * 100) / 100;
    const total = Math.round((base + variable) * 100) / 100;
    return {
      amount: total,
      breakdown: {
        base,
        porcentajePresupuesto: porcentaje,
        presupuestoEstimadoQ: presupuesto,
        cargoVariable: variable,
        total,
        nota:
          presupuesto > 0
            ? 'Tasa = base + presupuesto estimado x porcentaje (tarifa F08 provisional)'
            : 'Sin presupuesto estimado registrado: se cobra solo la base (tarifa F08 provisional)',
      },
    };
  }

  /** Crea (o recrea) el cobro del expediente. Lo usa el módulo inspections al aprobar la alineación. */
  async createForApplication(
    applicationId: string,
    feeFormula: Prisma.JsonValue,
    formData: Prisma.JsonValue,
  ) {
    const { amount, breakdown } = PaymentsService.calculateFee(feeFormula, formData);
    return this.prisma.payment.upsert({
      where: { applicationId },
      update: { amount, breakdown, receiptPath: null, confirmedById: null, confirmedAt: null },
      create: { applicationId, amount, breakdown },
    });
  }

  private async getApplicationWithPayment(tenantId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        licenseType: { include: { requirements: true } },
        payment: true,
        applicant: { select: { id: true, fullName: true } },
      },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    return application;
  }

  private assertOwnerOrStaff(user: AuthenticatedUser, applicantId: string) {
    const staffRoles = ['REVISOR', 'ADMIN', 'SUPERADMIN', 'INSPECTOR'];
    if (user.role === 'SOLICITANTE' && user.id !== applicantId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
    if (!staffRoles.includes(user.role) && user.id !== applicantId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
  }

  // ─────────────────────────── Consulta del cobro ───────────────────────────

  async getPayment(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getApplicationWithPayment(user.tenantId, applicationId);
    this.assertOwnerOrStaff(user, application.applicantId);
    if (!application.payment) {
      throw new NotFoundException('Aún no hay cobro calculado para este expediente');
    }
    return application.payment;
  }

  // ──────────────────────── Pago en línea simulado ────────────────────────

  async paySimulated(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getApplicationWithPayment(user.tenantId, applicationId);
    if (application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede pagar este expediente');
    }
    if (application.status !== 'PENDIENTE_DE_PAGO') {
      throw new BadRequestException(
        `El pago solo está disponible en estado PENDIENTE_DE_PAGO (actual: ${application.status})`,
      );
    }
    const payment = application.payment;
    if (!payment) throw new NotFoundException('No hay cobro calculado para este expediente');
    if (payment.confirmedAt) {
      throw new BadRequestException('El pago de este expediente ya fue confirmado');
    }
    if (payment.receiptPath) {
      throw new BadRequestException('Ya existe un comprobante registrado para este expediente');
    }

    // Comprobante simulado (decisión D-004): PDF mínimo generado en código
    const receiptNumber = `SIM-${Date.now()}`;
    const pdf = buildSimplePdf('COMPROBANTE DE PAGO - SIMULACION', [
      `Comprobante No. ${receiptNumber}`,
      `Municipalidad: ${user.tenantId}`,
      `Expediente: ${application.formCode} - ${application.id}`,
      `Contribuyente: ${application.applicant.fullName}`,
      `Fecha: ${new Date().toLocaleString('es-GT')}`,
      ``,
      `Monto pagado: Q ${Number(payment.amount).toFixed(2)}`,
      ``,
      `ESTE DOCUMENTO ES UNA SIMULACION SIN VALOR FISCAL NI LEGAL.`,
    ]);

    const receiptPath = await this.storage.save(
      user.tenantId,
      applicationId,
      pdf,
      `comprobante-simulado-${receiptNumber}.pdf`,
    );

    // El comprobante se adjunta como documento D-15 (requisito de etapa PAGO)
    const pagoRequirement = application.licenseType.requirements.find((r) => r.stage === 'PAGO');
    if (!pagoRequirement) {
      throw new BadRequestException('El tipo de licencia no tiene requisito de comprobante de pago');
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { receiptPath, simulated: true },
      }),
      this.prisma.applicationDocument.updateMany({
        where: { applicationId, requirementId: pagoRequirement.id, isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.applicationDocument.create({
        data: {
          applicationId,
          requirementId: pagoRequirement.id,
          version: 1,
          fileName: `comprobante-simulado-${receiptNumber}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: pdf.length,
          storagePath: receiptPath,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Pago en línea SIMULADO registrado (${receiptNumber}, Q ${Number(payment.amount).toFixed(2)}); comprobante adjuntado como ${pagoRequirement.code}`,
        },
      }),
    ]);

    await this.notifications.notifyRole(
      user.tenantId,
      'REVISOR',
      'Comprobante de pago generado',
      `El solicitante generó el comprobante de pago simulado ${receiptNumber} del expediente ${application.formCode}. Pendiente de confirmación.`,
      applicationId,
    );

    return { receiptNumber, receiptPath, simulated: true };
  }

  // ─────────────────── Confirmación del pago (municipalidad) ───────────────────

  async confirmPayment(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getApplicationWithPayment(user.tenantId, applicationId);
    if (application.status !== 'PENDIENTE_DE_PAGO') {
      throw new BadRequestException(
        `La confirmación de pago solo aplica en estado PENDIENTE_DE_PAGO (actual: ${application.status})`,
      );
    }
    const payment = application.payment;
    if (!payment) {
      throw new NotFoundException('No hay cobro calculado para este expediente');
    }
    if (payment.confirmedAt) {
      throw new BadRequestException('El pago ya fue confirmado');
    }

    // El comprobante D-15 vigente es la fuente de verdad: lo genera el pago
    // simulado o lo sube el solicitante como comprobante externo
    const pagoRequirement = application.licenseType.requirements.find((r) => r.stage === 'PAGO');
    const receiptDoc = await this.prisma.applicationDocument.findFirst({
      where: { applicationId, requirementId: pagoRequirement?.id, isCurrent: true },
    });
    if (!receiptDoc) {
      throw new BadRequestException(
        'No hay comprobante de pago (D-15) registrado; el solicitante debe pagar en línea (simulado) o subir el comprobante externo',
      );
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          confirmedById: user.id,
          confirmedAt: new Date(),
          // Si el comprobante fue externo, se registra su ruta de almacenamiento
          receiptPath: payment.receiptPath ?? receiptDoc.storagePath,
        },
      }),
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'LICENCIA_EMITIDA' },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Pago confirmado por ${user.fullName} (Q ${Number(payment.amount).toFixed(2)}, simulado=${payment.simulated})`,
          fromStatus: 'PENDIENTE_DE_PAGO',
          toStatus: 'LICENCIA_EMITIDA',
        },
      }),
    ]);

    await this.notifications.notifyUser(
      application.applicantId,
      user.tenantId,
      'Pago confirmado',
      `La municipalidad confirmó su pago de Q ${Number(payment.amount).toFixed(2)}. Su licencia está en proceso de emisión.`,
      applicationId,
    );

    return { status: 'LICENCIA_EMITIDA' as const };
  }
}
