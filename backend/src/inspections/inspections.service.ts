import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  InspectionStatus,
  InspectionType,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { StorageService } from '../documents/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { InspectionResultDto } from './dto/inspection-result.dto';

const ACTIVE_STATUSES: InspectionStatus[] = ['SOLICITADA', 'FECHAS_PROPUESTAS', 'CONFIRMADA'];

const TYPE_LABEL: Record<InspectionType, string> = {
  ALINEACION: 'alineación territorial',
  INTERMEDIA: 'inspección intermedia',
  RECEPCION_OBRA: 'recepción de obra',
};

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
    private readonly storage: StorageService,
  ) {}

  private async getApplication(tenantId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: { licenseType: true, applicant: { select: { id: true, fullName: true } } },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    return application;
  }

  private async getInspection(tenantId: string, inspectionId: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, application: { tenantId } },
      include: {
        application: { include: { licenseType: true, applicant: { select: { id: true, fullName: true } } } },
        inspector: { select: { id: true, fullName: true } },
      },
    });
    if (!inspection) throw new NotFoundException('Inspección no encontrada');
    return inspection;
  }

  // ─────────────────── Solicitud de inspección de alineación ───────────────────

  async requestAlineacion(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getApplication(user.tenantId, applicationId);
    if (application.status !== 'ALINEACION_PROGRAMADA') {
      throw new BadRequestException(
        `La inspección de alineación se solicita con el expediente en ALINEACION_PROGRAMADA (actual: ${application.status})`,
      );
    }
    const active = await this.prisma.inspection.findFirst({
      where: { applicationId, type: 'ALINEACION', status: { in: ACTIVE_STATUSES } },
    });
    if (active) {
      throw new BadRequestException('Ya existe una inspección de alineación activa para este expediente');
    }

    const inspection = await this.prisma.inspection.create({
      data: { applicationId, type: 'ALINEACION' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        applicationId,
        action: 'Inspección de alineación territorial solicitada',
      },
    });
    await this.notifications.notifyRole(
      user.tenantId,
      'INSPECTOR',
      'Nueva inspección de alineación',
      `Se solicitó una inspección de alineación territorial para el expediente ${application.formCode} (${application.applicant.fullName}). Proponga fechas desde su agenda.`,
      applicationId,
    );
    return inspection;
  }

  // ─────────────────── Solicitud de recepción de obra (solicitante) ───────────────────

  async requestRecepcion(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getApplication(user.tenantId, applicationId);
    if (application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede solicitar la recepción de obra');
    }
    if (application.status !== 'LICENCIA_EMITIDA') {
      throw new BadRequestException(
        `La recepción de obra se solicita cuando la licencia está emitida (actual: ${application.status})`,
      );
    }
    const active = await this.prisma.inspection.findFirst({
      where: { applicationId, type: 'RECEPCION_OBRA', status: { in: ACTIVE_STATUSES } },
    });
    if (active) {
      throw new BadRequestException('Ya existe una recepción de obra en curso para este expediente');
    }

    const [inspection] = await this.prisma.$transaction([
      this.prisma.inspection.create({
        data: { applicationId, type: 'RECEPCION_OBRA' },
      }),
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'RECEPCION_DE_OBRA' },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: 'Inspección de recepción de obra solicitada por el solicitante',
          fromStatus: 'LICENCIA_EMITIDA',
          toStatus: 'RECEPCION_DE_OBRA',
        },
      }),
    ]);
    await this.notifications.notifyRole(
      user.tenantId,
      'INSPECTOR',
      'Nueva inspección de recepción de obra',
      `El solicitante ${application.applicant.fullName} solicitó la recepción de obra del expediente ${application.formCode}. Proponga fechas desde su agenda.`,
      applicationId,
    );
    return inspection;
  }

  // ─────────────────────────── Agenda del inspector ───────────────────────────

  async list(user: AuthenticatedUser, status?: InspectionStatus) {
    const isInspector = user.role === 'INSPECTOR';
    return this.prisma.inspection.findMany({
      where: {
        application: { tenantId: user.tenantId },
        ...(status ? { status } : {}),
        // El inspector ve las solicitudes abiertas y las que tiene asignadas
        ...(isInspector
          ? { OR: [{ inspectorId: user.id }, { inspectorId: null }] }
          : {}),
      },
      include: {
        inspector: { select: { fullName: true } },
        application: {
          select: {
            id: true,
            formCode: true,
            status: true,
            formData: true,
            applicant: { select: { fullName: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─────────────────────── Propuesta de fechas (inspector) ───────────────────────

  async proposeDates(user: AuthenticatedUser, inspectionId: string, dates: string[]) {
    const inspection = await this.getInspection(user.tenantId, inspectionId);
    if (inspection.status !== 'SOLICITADA' && inspection.status !== 'FECHAS_PROPUESTAS') {
      throw new BadRequestException(
        `No se pueden proponer fechas en estado ${inspection.status}`,
      );
    }
    // Una vez asignada, solo el inspector asignado puede modificar la propuesta
    if (inspection.inspectorId && inspection.inspectorId !== user.id) {
      throw new ForbiddenException('Esta inspección ya está asignada a otro inspector');
    }

    const parsed = dates.map((d) => new Date(d));
    const now = new Date();
    if (parsed.some((d) => Number.isNaN(d.getTime()) || d <= now)) {
      throw new BadRequestException('Todas las fechas propuestas deben ser futuras y válidas');
    }
    const unique = [...new Set(parsed.map((d) => d.getTime()))].map((t) => new Date(t));
    if (unique.length !== parsed.length) {
      throw new BadRequestException('Las fechas propuestas deben ser distintas entre sí');
    }

    const updated = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        inspectorId: user.id,
        proposedDates: unique,
        status: 'FECHAS_PROPUESTAS',
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        applicationId: inspection.applicationId,
        action: `Inspector propuso ${unique.length} fecha(s) para ${TYPE_LABEL[inspection.type]}`,
      },
    });
    await this.notifications.notifyUser(
      inspection.application.applicantId,
      user.tenantId,
      'Fechas propuestas para su inspección',
      `El inspector ${user.fullName} propuso fechas para la ${TYPE_LABEL[inspection.type]} del expediente ${inspection.application.formCode}. Ingrese para confirmar la que prefiera.`,
      inspection.applicationId,
    );
    return updated;
  }

  // ───────────────────── Confirmación de fecha (solicitante) ─────────────────────

  async confirmDate(user: AuthenticatedUser, inspectionId: string, date: string) {
    const inspection = await this.getInspection(user.tenantId, inspectionId);
    if (inspection.application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede confirmar la fecha');
    }
    if (inspection.status !== 'FECHAS_PROPUESTAS') {
      throw new BadRequestException(
        `No hay fechas por confirmar (estado actual: ${inspection.status})`,
      );
    }
    const chosen = new Date(date);
    const match = inspection.proposedDates.find((d) => d.getTime() === chosen.getTime());
    if (!match) {
      throw new BadRequestException('La fecha elegida debe ser una de las propuestas por el inspector');
    }

    const updated = await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: { confirmedDate: match, status: 'CONFIRMADA' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        applicationId: inspection.applicationId,
        action: `Fecha de ${TYPE_LABEL[inspection.type]} confirmada para ${match.toLocaleString('es-GT')}`,
      },
    });
    const when = match.toLocaleString('es-GT');
    await this.notifications.notifyUser(
      inspection.application.applicantId,
      user.tenantId,
      'Visita de inspección confirmada',
      `Su visita de ${TYPE_LABEL[inspection.type]} quedó confirmada para el ${when}. Inspector: ${inspection.inspector?.fullName ?? 'por asignar'}.`,
      inspection.applicationId,
    );
    if (inspection.inspectorId) {
      await this.notifications.notifyUser(
        inspection.inspectorId,
        user.tenantId,
        'Visita confirmada por el solicitante',
        `El solicitante confirmó la visita de ${TYPE_LABEL[inspection.type]} del expediente ${inspection.application.formCode} para el ${when}.`,
        inspection.applicationId,
      );
    }
    return updated;
  }

  // ─────────────────── Registro del resultado (inspector, con foto) ───────────────────

  async registerResult(
    user: AuthenticatedUser,
    inspectionId: string,
    dto: InspectionResultDto,
    photo: Express.Multer.File,
  ) {
    const inspection = await this.getInspection(user.tenantId, inspectionId);
    if (inspection.inspectorId !== user.id) {
      throw new ForbiddenException('Solo el inspector asignado puede registrar el resultado');
    }
    if (inspection.status !== 'CONFIRMADA') {
      throw new BadRequestException(
        `El resultado se registra con la visita en estado CONFIRMADA (actual: ${inspection.status})`,
      );
    }

    const photoPath = await this.storage.save(
      user.tenantId,
      inspection.applicationId,
      photo.buffer,
      photo.originalname,
    );

    const application = inspection.application;
    let transition: { from: ApplicationStatus; to: ApplicationStatus; note: string };

    if (inspection.type === 'ALINEACION') {
      transition =
        dto.result === 'CONFORME'
          ? {
              from: 'ALINEACION_PROGRAMADA',
              to: 'PENDIENTE_DE_PAGO',
              note: 'Alineación territorial CONFORME',
            }
          : {
              from: 'ALINEACION_PROGRAMADA',
              to: 'EN_REVISION_TECNICA',
              note: 'Alineación territorial NO CONFORME',
            };
    } else {
      // RECEPCION_OBRA: conforme cierra el expediente; no conforme lo mantiene en recepción
      transition =
        dto.result === 'CONFORME'
          ? { from: 'RECEPCION_DE_OBRA', to: 'CERRADO', note: 'Recepción de obra CONFORME' }
          : { from: 'RECEPCION_DE_OBRA', to: 'RECEPCION_DE_OBRA', note: 'Recepción de obra NO CONFORME' };
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.inspection.update({
        where: { id: inspectionId },
        data: {
          status: 'REALIZADA',
          result: dto.result,
          resultNote: dto.note,
          photoPaths: [photoPath],
        },
      }),
      this.prisma.application.update({
        where: { id: application.id },
        data: { status: transition.to },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId: application.id,
          action: `${transition.note}: ${dto.note}`,
          fromStatus: transition.from,
          toStatus: transition.to,
        },
      }),
    ];

    // Alineación NO_CONFORME: observación general que el revisor verá al retomar la revisión
    if (inspection.type === 'ALINEACION' && dto.result === 'NO_CONFORME') {
      ops.push(
        this.prisma.observation.create({
          data: {
            applicationId: application.id,
            authorId: user.id,
            round: application.correctionRound + 1,
            priority: 'ALTA',
            text: `Inspección de alineación territorial NO CONFORME: ${dto.note}`,
          },
        }),
      );
    }

    await this.prisma.$transaction(ops);

    // Alineación CONFORME: calcular la tasa y crear el cobro
    if (inspection.type === 'ALINEACION' && dto.result === 'CONFORME') {
      const payment = await this.payments.createForApplication(
        application.id,
        application.licenseType.feeFormula,
        application.formData,
      );
      await this.notifications.notifyUser(
        application.applicantId,
        user.tenantId,
        'Alineación conforme — tasa calculada',
        `La inspección de alineación fue CONFORME. Tasa municipal calculada: Q ${Number(payment.amount).toFixed(2)}. Ingrese para ver el desglose y pagar.`,
        application.id,
      );
    } else {
      await this.notifications.notifyUser(
        application.applicantId,
        user.tenantId,
        `Resultado de ${TYPE_LABEL[inspection.type]}: ${dto.result}`,
        dto.note,
        application.id,
      );
    }
    if (application.reviewerId) {
      await this.notifications.notifyUser(
        application.reviewerId,
        user.tenantId,
        `Resultado de ${TYPE_LABEL[inspection.type]}: ${dto.result}`,
        `Expediente ${application.formCode}: ${dto.note}`,
        application.id,
      );
    }
    if (inspection.type === 'RECEPCION_OBRA') {
      await this.notifications.notifyRole(
        user.tenantId,
        'ADMIN',
        `Recepción de obra: ${dto.result}`,
        `Expediente ${application.formCode} — ${dto.result === 'CONFORME' ? 'expediente cerrado' : 'permanece en recepción de obra'}: ${dto.note}`,
        application.id,
      );
    }

    return { status: 'REALIZADA' as const, result: dto.result, applicationStatus: transition.to };
  }
}
