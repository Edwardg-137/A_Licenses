import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
// file-type fijado en v16 (última versión CommonJS — decisión D-008);
// sus tipos vienen de @types/file-type y exponen la API legacy fromBuffer.
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ContentValidationService } from '../content-validation/content-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

/** Límite de tamaño por archivo (25 MB), alineado con el interceptor Multer. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Estados en los que el propietario puede cargar o reemplazar documentos. */
const UPLOAD_ALLOWED_STATES: ApplicationStatus[] = [
  'BORRADOR',
  'OBSERVADO_FORMATO',
  'EN_CORRECCION',
  'PENDIENTE_DE_PAGO', // solo requisitos de etapa PAGO (ver upload)
];

/**
 * Firmas mínimas para archivos demasiado cortos para el análisis completo de
 * file-type (que lanza End-Of-Stream con buffers pequeños, decisión D-009).
 */
function sniffShortSignature(buffer: Buffer): string | undefined {
  const head = buffer.subarray(0, 8);
  if (head.length >= 4 && head.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (
    head.length >= 8 &&
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) {
    return 'image/png';
  }
  return undefined;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly contentValidation: ContentValidationService,
  ) {}

  /**
   * Carga o reemplaza el documento de un requisito. La detección de MIME se
   * hace por contenido (file-type), nunca por la extensión del cliente.
   */
  async upload(
    user: AuthenticatedUser,
    applicationId: string,
    requirementId: string,
    file: Express.Multer.File,
  ) {
    if (user.role !== 'SOLICITANTE') {
      throw new ForbiddenException('Solo el solicitante puede cargar documentos');
    }
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo o el archivo está vacío');
    }

    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, tenantId: user.tenantId },
    });
    if (!application) throw new NotFoundException('Expediente no encontrado');
    if (application.applicantId !== user.id) {
      throw new ForbiddenException('Solo el propietario puede cargar documentos en este expediente');
    }
    if (!UPLOAD_ALLOWED_STATES.includes(application.status)) {
      throw new BadRequestException(
        `No se pueden cargar documentos en el estado actual (${application.status})`,
      );
    }

    const requirement = await this.prisma.documentRequirement.findFirst({
      where: {
        id: requirementId,
        licenseType: { id: application.licenseTypeId },
      },
    });
    if (!requirement) {
      throw new NotFoundException('El requisito no pertenece a este tipo de licencia');
    }

    // En PENDIENTE_DE_PAGO solo se aceptan requisitos de etapa PAGO (D-15);
    // los documentos de ingreso quedan bloqueados (03-flujo §4)
    if (application.status === 'PENDIENTE_DE_PAGO') {
      if (requirement.stage !== 'PAGO') {
        throw new BadRequestException(
          'En esta etapa solo se puede cargar el comprobante de pago (D-15)',
        );
      }
    } else if (requirement.stage === 'PAGO') {
      throw new BadRequestException(
        'El comprobante de pago (D-15) se carga cuando el expediente está en PENDIENTE_DE_PAGO',
      );
    }

    // En EN_CORRECCION solo se pueden reemplazar los documentos observados
    // (mvp_docs/03-flujo §4: "el resto queda bloqueado")
    if (application.status === 'EN_CORRECCION') {
      const currentDoc = await this.prisma.applicationDocument.findFirst({
        where: { applicationId, requirementId, isCurrent: true },
      });
      const marked =
        currentDoc &&
        ['CON_OBSERVACION', 'REQUIERE_REEMPLAZO'].includes(currentDoc.reviewStatus);
      if (!marked) {
        throw new BadRequestException(
          `El documento ${requirement.code} no está observado; en estado de corrección solo se pueden reemplazar los documentos observados.`,
        );
      }
    }

    // Detección de MIME real por contenido del archivo (decisión D-009).
    // Reglas:
    //  - Si el contenido coincide con un tipo reconocido distinto al reportado
    //    por el cliente → el archivo es falso: se rechaza.
    //  - Si el contenido no es reconocible (sin firma conocida, p. ej. archivos
    //    muy pequeños) se usa el MIME del cliente (el revisor lo validará).
    //  - DWG real: firma "AC" + versión → image/vnd.dwg (file-type v16 no lo cubre).
    let detectedMime: string | undefined;
    try {
      detectedMime = (await fileTypeFromBuffer(file.buffer))?.mime;
    } catch {
      // Archivo demasiado corto para el análisis completo: se comparan al menos
      // las firmas mínimas de los formatos aceptados (decisión D-009).
      detectedMime = sniffShortSignature(file.buffer);
    }

    let mimeType: string;
    if (!detectedMime && file.buffer.length >= 6 && file.buffer.toString('ascii', 0, 2) === 'AC') {
      mimeType = 'image/vnd.dwg';
    } else if (detectedMime) {
      if (detectedMime !== file.mimetype) {
        throw new BadRequestException(
          `El contenido del archivo (${detectedMime}) no coincide con lo declarado (${file.mimetype}). Verifique el archivo.`,
        );
      }
      mimeType = detectedMime;
    } else {
      mimeType = file.mimetype;
    }
    if (!requirement.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Formato no permitido (${mimeType}). Este documento acepta: ${requirement.allowedMimeTypes.join(', ')}`,
      );
    }

    const storagePath = await this.storage.save(
      user.tenantId,
      applicationId,
      file.buffer,
      file.originalname,
    );

    const contentCheck = await this.contentValidation.analyzeDocument({
      buffer: file.buffer,
      mimeType,
      requirementCode: requirement.code,
      formCode: application.formCode,
    });

    // Versionado: se desactiva el documento vigente y se crea la nueva versión
    const current = await this.prisma.applicationDocument.findFirst({
      where: { applicationId, requirementId, isCurrent: true },
    });

    const [document] = await this.prisma.$transaction([
      this.prisma.applicationDocument.create({
        data: {
          applicationId,
          requirementId,
          version: (current?.version ?? 0) + 1,
          fileName: file.originalname,
          storagePath,
          mimeType,
          sizeBytes: file.size,
          contentCheck: contentCheck as unknown as Prisma.InputJsonValue,
        },
      }),
      ...(current
        ? [
            this.prisma.applicationDocument.update({
              where: { id: current.id },
              data: { isCurrent: false },
            }),
          ]
        : []),
      this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          applicationId,
          action: current
            ? `Documento ${requirement.code} "${requirement.name}" reemplazado (versión ${(current.version ?? 0) + 1})`
            : `Documento ${requirement.code} "${requirement.name}" cargado`,
        },
      }),
    ]);

    return {
      id: document.id,
      requirementId: document.requirementId,
      version: document.version,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
      contentCheck,
    };
  }

  /** Verifica acceso y devuelve lo necesario para hacer streaming del archivo. */
  async getForDownload(user: AuthenticatedUser, documentId: string) {
    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });
    if (!document || document.application.tenantId !== user.tenantId) {
      throw new NotFoundException('Documento no encontrado');
    }

    const isOwner = document.application.applicantId === user.id;
    const isStaff = ['REVISOR', 'INSPECTOR', 'ADMIN', 'SUPERADMIN'].includes(user.role);
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('No tiene acceso a este documento');
    }

    return {
      stream: this.storage.openRead(document.storagePath),
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }
}
