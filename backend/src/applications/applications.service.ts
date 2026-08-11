import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Application,
  ApplicationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { classifyProject, ClassifyInput, ClassifyResult } from './classification';
import {
  CreateApplicationDto,
  ProjectFormDataDto,
} from './dto/create-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';

export interface DocumentCheckResult {
  requirementId: string;
  code: string;
  name: string;
  stage: string;
  hasDocument: boolean;
  valid: boolean;
  issues: string[];
}

/** Roles del personal municipal que pueden ver todos los expedientes del tenant. */
const STAFF_ROLES: UserRole[] = ['REVISOR', 'INSPECTOR', 'ADMIN', 'SUPERADMIN'];

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ────────────────────────── Clasificación ──────────────────────────

  /** Clasificación F08 (L-01) vs F02 (L-02). Ver `classification.ts`. */
  classify(
    form: Pick<
      ProjectFormDataDto,
      'uso' | 'areaConstruccionM2' | 'centroHistorico' | 'cambioUsoSuelo'
    >,
  ): ClassifyResult {
    return classifyProject(form as ClassifyInput);
  }

  // ────────────────────────── CRUD del expediente ──────────────────────────

  async create(user: AuthenticatedUser, dto: CreateApplicationDto) {
    if (user.role !== 'SOLICITANTE') {
      throw new ForbiddenException('Solo los solicitantes pueden crear expedientes');
    }

    const licenseType = await this.prisma.licenseType.findFirst({
      where: { id: dto.licenseTypeId, tenantId: user.tenantId, active: true },
    });
    if (!licenseType) {
      throw new NotFoundException('Tipo de licencia no encontrado o inactivo');
    }

    const classification = this.classify(dto.formData);
    if (!classification.available || !classification.formCode) {
      throw new BadRequestException({
        message:
          'El proyecto no califica para el trámite en línea. Debe proceder presencialmente en Ventanilla Única.',
        reasons: classification.reasons,
      });
    }

    if (licenseType.formCode !== classification.formCode) {
      throw new BadRequestException({
        message: `El tipo de licencia no corresponde a la clasificación (${classification.formCode} / ${classification.licenseTypeCode}).`,
        reasons: classification.reasons,
      });
    }

    this.assertFormDataForFormCode(classification.formCode, dto.formData);

    // El colegiado responsable se toma del perfil verificado del solicitante
    const applicant = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    const application = await this.prisma.application.create({
      data: {
        tenantId: user.tenantId,
        licenseTypeId: licenseType.id,
        applicantId: user.id,
        formCode: classification.formCode,
        formData: {
          ...dto.formData,
          colegiadoTipo: applicant.collegeType,
          colegiadoNumero: applicant.collegeNumber,
        },
      },
    });

    await this.audit(
      user.tenantId,
      user.id,
      application.id,
      `Expediente creado en estado Borrador (${classification.formCode} / ${licenseType.code})`,
    );

    return application;
  }

  /** Campos mínimos adicionales exigidos según formulario municipal. */
  private assertFormDataForFormCode(formCode: 'F08' | 'F02', form: ProjectFormDataDto) {
    if (formCode !== 'F02') return;
    const missing: string[] = [];
    if (form.areaTerrenoM2 == null || form.areaTerrenoM2 < 0) {
      missing.push('área del terreno (RGP)');
    }
    if (!form.descripcionTrabajos?.trim()) {
      missing.push('descripción de los trabajos');
    }
    if (form.tiempoEjecucionAnios == null || form.tiempoEjecucionAnios < 1) {
      missing.push('tiempo estimado de ejecución (años)');
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        `Para el formulario F02 faltan campos obligatorios: ${missing.join(', ')}`,
      );
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: CreateApplicationDto['formData']) {
    const application = await this.getOwnedByStatus(user, id, ['BORRADOR']);
    await this.prisma.application.update({
      where: { id: application.id },
      data: { formData: dto as unknown as Prisma.InputJsonValue },
    });
    await this.audit(user.tenantId, user.id, id, 'Formulario del expediente actualizado');
    return this.findOne(user, id);
  }

  // ────────────────────────── Listados ──────────────────────────

  async list(user: AuthenticatedUser, filters: ListApplicationsDto) {
    const where: Prisma.ApplicationWhereInput = {
      tenantId: user.tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59.999Z') } : {}),
            },
          }
        : {}),
      // El solicitante solo ve sus propios expedientes
      ...(user.role === 'SOLICITANTE' ? { applicantId: user.id } : {}),
    };

    return this.prisma.application.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        licenseType: { select: { code: true, name: true } },
        applicant: { select: { fullName: true, email: true } },
        reviewer: { select: { fullName: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        licenseType: {
          include: {
            requirements: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        applicant: {
          select: {
            fullName: true,
            email: true,
            collegeType: true,
            collegeNumber: true,
          },
        },
        reviewer: { select: { fullName: true } },
        documents: {
          where: { isCurrent: true },
          select: {
            id: true,
            requirementId: true,
            version: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            reviewStatus: true,
            uploadedAt: true,
          },
        },
        observations: {
          orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
          include: {
            author: { select: { fullName: true } },
            document: {
              select: {
                requirementId: true,
                requirement: { select: { code: true, name: true } },
              },
            },
          },
        },
        inspections: {
          orderBy: { createdAt: 'desc' },
          include: { inspector: { select: { fullName: true } } },
        },
        payment: true,
        license: {
          select: {
            id: true,
            number: true,
            qrToken: true,
            issuedAt: true,
            validUntil: true,
          },
        },
      },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    this.assertCanView(user, application);

    const validationReport = this.buildValidationReport(
      application.licenseType.requirements,
      application.documents,
    );

    // Marca los documentos reemplazados tras una observación (el revisor los
    // distingue en verde respecto a la ronda anterior)
    const documents = application.documents.map((doc) => {
      const lastObservation = application.observations
        .filter((o) => o.document?.requirementId === doc.requirementId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return {
        ...doc,
        replacedAfterObservation: Boolean(
          lastObservation && doc.uploadedAt > lastObservation.createdAt,
        ),
      };
    });

    return {
      ...application,
      documents,
      validationReport,
      license: application.license
        ? {
            ...application.license,
            verifyUrl: `${(process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/verificar/${application.license.qrToken}`,
          }
        : null,
    };
  }

  /** Tipos de licencia activos del tenant con sus requisitos (para el asistente de creación). */
  listLicenseTypes(tenantId: string) {
    return this.prisma.licenseType.findMany({
      where: { tenantId, active: true },
      include: { requirements: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ─────────────────── Validación automática y envío ───────────────────

  /** "Verificar antes de enviar": informe sin cambiar el estado. */
  async validate(user: AuthenticatedUser, id: string) {
    const application = await this.getOwnedByStatus(user, id, ['BORRADOR', 'OBSERVADO_FORMATO']);
    const withDocs = await this.prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: {
        licenseType: { include: { requirements: { orderBy: { sortOrder: 'asc' } } } },
        documents: { where: { isCurrent: true } },
      },
    });
    return this.buildValidationReport(withDocs.licenseType.requirements, withDocs.documents);
  }

  /**
   * Envío del expediente: validación automática de los documentos de etapa
   * INGRESO (presencia, formato real, integridad) y transición de estado.
   */
  async submit(user: AuthenticatedUser, id: string) {
    const application = await this.getOwnedByStatus(user, id, ['BORRADOR', 'OBSERVADO_FORMATO']);
    const withDocs = await this.prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: {
        licenseType: { include: { requirements: { orderBy: { sortOrder: 'asc' } } } },
        documents: { where: { isCurrent: true } },
        applicant: { select: { fullName: true } },
      },
    });

    const report = this.buildValidationReport(
      withDocs.licenseType.requirements,
      withDocs.documents,
    );
    const allValid = report.every((r) => r.stage !== 'INGRESO' || r.valid);

    if (!allValid) {
      await this.prisma.application.update({
        where: { id },
        data: { status: 'OBSERVADO_FORMATO' },
      });
      await this.audit(user.tenantId, user.id, id, 'Validación automática fallida', 'BORRADOR', 'OBSERVADO_FORMATO');
      await this.notifications.notifyUser(
        user.id,
        user.tenantId,
        'Expediente observado por formato',
        'Algunos documentos faltan o no tienen el formato correcto. Revise el informe de validación del expediente.',
        id,
      );
      return { status: 'OBSERVADO_FORMATO' as const, validationReport: report };
    }

    await this.prisma.application.update({
      where: { id },
      data: {
        status: 'EN_REVISION_TECNICA',
        ...(application.submittedAt ? {} : { submittedAt: new Date() }),
      },
    });
    await this.audit(user.tenantId, user.id, id, 'Expediente enviado a revisión técnica', application.status, 'EN_REVISION_TECNICA');
    await this.notifications.notifyUser(
      user.id,
      user.tenantId,
      'Expediente enviado',
      'Su expediente pasó la validación automática y está en revisión técnica.',
      id,
    );
    await this.notifications.notifyRole(
      user.tenantId,
      'REVISOR',
      'Nuevo expediente en revisión',
      `El expediente de ${withDocs.applicant.fullName} (${withDocs.formCode}) está listo para revisión técnica.`,
      id,
    );
    await this.notifications.notifyRole(
      user.tenantId,
      'ADMIN',
      'Expediente enviado',
      `Nuevo expediente ${withDocs.formCode} de ${withDocs.applicant.fullName} en revisión técnica.`,
      id,
    );

    return { status: 'EN_REVISION_TECNICA' as const, validationReport: report };
  }

  // ─────────────────── Asignación de revisor (Admin) ───────────────────

  async assignReviewer(admin: AuthenticatedUser, id: string, reviewerId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, tenantId: admin.tenantId },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');

    const reviewer = await this.prisma.user.findFirst({
      where: { id: reviewerId, tenantId: admin.tenantId, role: 'REVISOR', status: 'ACTIVE' },
    });
    if (!reviewer) {
      throw new BadRequestException('El usuario indicado no es un revisor activo de esta municipalidad');
    }

    await this.prisma.application.update({
      where: { id },
      data: { reviewerId },
    });
    await this.audit(admin.tenantId, admin.id, id, `Expediente asignado al revisor ${reviewer.fullName}`);
    await this.notifications.notifyUser(
      reviewerId,
      admin.tenantId,
      'Expediente asignado',
      `Se le asignó un expediente (${application.formCode}) para revisión técnica.`,
      id,
    );
    return this.findOne(admin, id);
  }

  // ────────────────────────── Helpers internos ──────────────────────────

  /** Informe por documento: presencia, formato e integridad (tamaño). Público: lo reutiliza el módulo review. */
  buildValidationReport(
    requirements: {
      id: string;
      code: string;
      name: string;
      stage: string;
      required: boolean;
      allowedMimeTypes: string[];
    }[],
    documents: {
      requirementId: string;
      mimeType: string;
      sizeBytes: number;
    }[],
  ): DocumentCheckResult[] {
    return requirements.map((req) => {
      const doc = documents.find((d) => d.requirementId === req.id);
      const issues: string[] = [];

      if (!doc) {
        if (req.required) issues.push('Documento no cargado');
      } else {
        if (!req.allowedMimeTypes.includes(doc.mimeType)) {
          issues.push(`Formato no permitido (${doc.mimeType}). Aceptados: ${req.allowedMimeTypes.join(', ')}`);
        }
        if (doc.sizeBytes <= 0) {
          issues.push('El archivo está vacío');
        }
      }

      return {
        requirementId: req.id,
        code: req.code,
        name: req.name,
        stage: req.stage,
        hasDocument: Boolean(doc),
        valid: issues.length === 0,
        issues,
      };
    });
  }

  /** Obtiene un expediente propio verificando que esté en uno de los estados permitidos. */
  private async getOwnedByStatus(
    user: AuthenticatedUser,
    id: string,
    statuses: ApplicationStatus[],
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    if (application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede modificar este expediente');
    }
    if (!statuses.includes(application.status)) {
      throw new BadRequestException(
        `La acción no está permitida en el estado actual del expediente (${application.status})`,
      );
    }
    return application;
  }

  private assertCanView(user: AuthenticatedUser, application: Application) {
    const isOwner = application.applicantId === user.id;
    const isStaff = STAFF_ROLES.includes(user.role as UserRole);
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
  }

  private audit(
    tenantId: string,
    userId: string,
    applicationId: string,
    action: string,
    fromStatus?: ApplicationStatus,
    toStatus?: ApplicationStatus,
  ) {
    return this.prisma.auditLog.create({
      data: { tenantId, userId, applicationId, action, fromStatus, toStatus },
    });
  }
}
