import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, ReadStream } from 'fs';
import { extname, join, normalize, resolve } from 'path';
import { pipeline } from 'stream/promises';

/**
 * Almacenamiento de archivos en disco local (desarrollo — decisión D-007).
 * En producción se reemplazará por S3/MinIO con URLs prefirmadas; esta clase
 * es el único punto de contacto con el sistema de archivos para facilitar
 * esa migración.
 *
 * Los archivos se guardan con nombre UUID impredecible; el nombre original
 * solo se conserva como metadato en la base de datos.
 */
@Injectable()
export class StorageService {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = resolve(process.env.UPLOADS_DIR ?? './uploads');
  }

  /** Guarda el buffer y devuelve la ruta relativa de almacenamiento. */
  async save(tenantId: string, applicationId: string, buffer: Buffer, originalName: string): Promise<string> {
    const dir = join(this.baseDir, tenantId, applicationId);
    mkdirSync(dir, { recursive: true });

    const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const storagePath = join(tenantId, applicationId, `${randomUUID()}${ext}`);

    try {
      await pipeline(
        (async function* () {
          yield buffer;
        })(),
        createWriteStream(join(this.baseDir, storagePath)),
      );
    } catch {
      throw new InternalServerErrorException('No se pudo guardar el archivo');
    }
    return storagePath;
  }

  /** Devuelve un stream de lectura para una ruta relativa previamente guardada. */
  openRead(storagePath: string): ReadStream {
    // Defensa contra path traversal: la ruta siempre la generó save()
    const fullPath = normalize(join(this.baseDir, storagePath));
    if (!fullPath.startsWith(this.baseDir) || !existsSync(fullPath)) {
      throw new InternalServerErrorException('Archivo no disponible');
    }
    return createReadStream(fullPath);
  }
}
