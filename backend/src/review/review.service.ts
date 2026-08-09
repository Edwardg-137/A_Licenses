import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { ApplicationsService } from '../applications/applications.service';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewDocumentDto } from './dto/review-document.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly applications: ApplicationsService,
  ) {}

  private async getInReview(tenantId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        licenseType: true,
        applicant: { select: { id: true, fullName: true } },
      },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    if (application.status !== 'EN_REVISION_TECNICA') {
      throw new BadRequestException(
        `La revisión técnica solo está disponible en estado EN_REVISION_TECNICA (actual: ${application.status})`,
      );
    }
    return application;
  }

  /** Ronda de revisión en curso (las observaciones nuevas llevan este número). */
  private currentRound(application: { correctionRound: number }) {
    return application.correctionRound + 1;
  }

  // ─────────────── Marcar documento (con observación opcional) ───────────────

  async reviewDocument(user: AuthenticatedUser, applicationId: string, dto: ReviewDocumentDto) {
    const application = await this.getInReview(user.tenantId, applicationId);
    const round = this.currentRound(application);

    const document = await this.prisma.applicationDocument.findFirst({
      where: { id: dto.documentId, applicationId, isCurrent: true },
      include: { requirement: true },
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado en este expediente');
    }

    if (dto.reviewStatus === 'PENDIENTE') {
      throw new BadRequestException('Debe indicar un estado de revisión definitivo');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.applicationDocument.update({
        where: { id: document.id },
        data: { reviewStatus: dto.reviewStatus },
      });

      // Las observaciones se resuelven/sustituyen por REQUISITO (no por versión):
      // cuando el solicitante reemplaza un documento, la observación queda ligada
      // a la versión anterior y el revisor confirma sobre la versión nueva.
      const pendingOfRequirement = {
        document: { requirementId: document.requirementId, applicationId },
        resolvedAt: null,
      } as const;

      if (dto.reviewStatus === 'CONFORME') {
        // Marcar conforme resuelve TODAS las observaciones pendientes del requisito,
        // de cualquier ronda (la ronda 1 sigue pendiente si el revisor confirma en la 2)
        await tx.observation.updateMany({
          where: pendingOfRequirement,
          data: { resolvedAt: new Date() },
        });
      } else {
        // Una nueva observación sustituye a las anteriores pendientes del requisito
        await tx.observation.updateMany({
          where: pendingOfRequirement,
          data: { resolvedAt: new Date() },
        });
        await tx.observation.create({
          data: {
            applicationId,
            documentId: document.id,
            authorId: user.id,
            round,
            priority: dto.priority!,
            text: dto.text!,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Documento ${document.requirement.code} "${document.requirement.name}" marcado como ${dto.reviewStatus} — Ronda ${round}`,
        },
      });
    });

    return { documentId: document.id, reviewStatus: dto.reviewStatus, round };
  }

  // ────────────────────────── Enviar a corrección ──────────────────────────

  async sendToCorrection(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getInReview(user.tenantId, applicationId);
    const round = this.currentRound(application);

    if (round >= application.licenseType.maxCorrectionRounds) {
      throw new BadRequestException(
        'Esta es la última ronda de revisión permitida: debe aprobar o rechazar con dictamen',
      );
    }

    const pendingObservations = await this.prisma.observation.findMany({
      where: { applicationId, round, resolvedAt: null },
      include: { document: { select: { requirement: { select: { code: true } } } } },
    });
    if (pendingObservations.length === 0) {
      throw new BadRequestException(
        'Registre al menos una observación antes de enviar el expediente a corrección',
      );
    }

    const codes = pendingObservations
      .map((o) => o.document?.requirement.code)
      .filter(Boolean)
      .join(', ');

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'EN_CORRECCION', correctionRound: round },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Expediente enviado a corrección con ${pendingObservations.length} observación(es) — Ronda ${round}`,
          fromStatus: 'EN_REVISION_TECNICA',
          toStatus: 'EN_CORRECCION',
        },
      }),
    ]);

    await this.notifications.notifyUser(
      application.applicantId,
      user.tenantId,
      'Observaciones en su expediente',
      `El revisor registró ${pendingObservations.length} observación(es) en los documentos: ${codes}. Suba las correcciones correspondientes.`,
      applicationId,
    );

    return { status: 'EN_CORRECCION' as const, round };
  }

  // ─────────────────────── Aprobar revisión técnica ───────────────────────

  async approveReview(user: AuthenticatedUser, applicationId: string) {
    const application = await this.getInReview(user.tenantId, applicationId);
    const round = this.currentRound(application);

    // La aprobación exige que no quede ninguna observación DOCUMENTAL sin
    // resolver, de cualquier ronda: cada documento observado debe confirmarse
    // como conforme. Las observaciones GENERALES (p. ej. alineación no
    // conforme, documentId = null) no bloquean: se consideran atendidas al
    // re-aprobar y se resuelven automáticamente abajo (D-010 + Fase 4).
    const unresolved = await this.prisma.observation.count({
      where: { applicationId, resolvedAt: null, documentId: { not: null } },
    });
    if (unresolved > 0) {
      throw new BadRequestException(
        `Hay ${unresolved} observación(es) sin resolver. Resuélvalas marcando los documentos como conformes o envíe el expediente a corrección.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'ALINEACION_PROGRAMADA' },
      }),
      // Las observaciones generales (sin documento, p. ej. alineación no
      // conforme) quedan resueltas al aprobar de nuevo la revisión
      this.prisma.observation.updateMany({
        where: { applicationId, documentId: null, resolvedAt: null },
        data: { resolvedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Revisión técnica aprobada — Ronda ${round}`,
          fromStatus: 'EN_REVISION_TECNICA',
          toStatus: 'ALINEACION_PROGRAMADA',
        },
      }),
    ]);

    await this.notifications.notifyUser(
      application.applicantId,
      user.tenantId,
      'Expediente aprobado técnicamente',
      'La revisión técnica de su expediente fue aprobada. El siguiente paso es la alineación territorial.',
      applicationId,
    );

    return { status: 'ALINEACION_PROGRAMADA' as const };
  }

  // ───────────────────────── Rechazo con dictamen ─────────────────────────

  async reject(user: AuthenticatedUser, applicationId: string, dictamen: string) {
    const application = await this.getInReview(user.tenantId, applicationId);
    const round = this.currentRound(application);

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'RECHAZADO', rejectedReason: dictamen, closedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Expediente rechazado con dictamen — Ronda ${round}`,
          fromStatus: 'EN_REVISION_TECNICA',
          toStatus: 'RECHAZADO',
        },
      }),
    ]);

    await this.notifications.notifyUser(
      application.applicantId,
      user.tenantId,
      'Expediente rechazado',
      `Su expediente fue rechazado. Dictamen: ${dictamen}`,
      applicationId,
    );

    return { status: 'RECHAZADO' as const };
  }

  // ─────────────────── Reenvío de correcciones (solicitante) ───────────────────

  async resubmit(user: AuthenticatedUser, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId: user.tenantId },
      include: {
        licenseType: { include: { requirements: true } },
        documents: { where: { isCurrent: true } },
      },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    if (application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede reenviar este expediente');
    }
    if (application.status !== ('EN_CORRECCION' as ApplicationStatus)) {
      throw new BadRequestException(
        `El reenvío de correcciones solo aplica en estado EN_CORRECCION (actual: ${application.status})`,
      );
    }

    // Todos los documentos observados deben haber sido reemplazados
    const stillMarked = application.documents.filter((d) =>
      ['CON_OBSERVACION', 'REQUIERE_REEMPLAZO'].includes(d.reviewStatus),
    );
    if (stillMarked.length > 0) {
      const codes = stillMarked
        .map((d) => application.licenseType.requirements.find((r) => r.id === d.requirementId)?.code)
        .filter(Boolean)
        .join(', ');
      throw new BadRequestException(
        `Aún hay documentos observados sin reemplazar: ${codes}`,
      );
    }

    // La validación automática de formato debe seguir pasando
    const report = this.applications.buildValidationReport(
      application.licenseType.requirements,
      application.documents,
    );
    const invalid = report.filter((r) => r.stage === 'INGRESO' && !r.valid);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `La validación automática falló para: ${invalid.map((r) => r.code).join(', ')}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'EN_REVISION_TECNICA' },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: `Correcciones reenviadas — Ronda ${application.correctionRound}`,
          fromStatus: 'EN_CORRECCION',
          toStatus: 'EN_REVISION_TECNICA',
        },
      }),
    ]);

    if (application.reviewerId) {
      await this.notifications.notifyUser(
        application.reviewerId,
        user.tenantId,
        'Correcciones recibidas',
        `El solicitante reenvió las correcciones del expediente (ronda ${application.correctionRound}). Los documentos reemplazados aparecen marcados.`,
        applicationId,
      );
    } else {
      await this.notifications.notifyRole(
        user.tenantId,
        'REVISOR',
        'Correcciones recibidas',
        `Un expediente sin revisor asignado recibió correcciones (ronda ${application.correctionRound}).`,
        applicationId,
      );
    }

    return { status: 'EN_REVISION_TECNICA' as const };
  }
}
