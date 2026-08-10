import { Controller, Get, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { LicensesService } from './licenses.service';

@Controller()
export class LicensesController {
  constructor(private readonly licenses: LicensesService) {}

  /** Metadatos de la licencia del expediente (propietario o personal municipal). */
  @Get('applications/:id/license')
  getLicense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.licenses.getForApplication(user, id);
  }

  /** Descarga del PDF oficial. */
  @Get('applications/:id/license/download')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const { stream, fileName, mimeType } = await this.licenses.getPdfForDownload(user, id);
    response.setHeader('Content-Type', mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    stream.pipe(response);
  }

  /** Backfill: emite el PDF si el expediente ya está pagado pero sin registro License. */
  @Post('applications/:id/issue-license')
  @Roles('REVISOR', 'ADMIN')
  issueLicense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.licenses.issueIfMissing(user, id);
  }

  /** Verificación pública por QR (sin autenticación). */
  @Public()
  @Get('licenses/verify/:token')
  verify(@Param('token') token: string) {
    return this.licenses.verifyPublic(token);
  }
}
