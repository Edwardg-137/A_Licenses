import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InspectionStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ConfirmDateDto } from './dto/confirm-date.dto';
import { InspectionResultDto } from './dto/inspection-result.dto';
import { ProposeDatesDto } from './dto/propose-dates.dto';
import { InspectionsService } from './inspections.service';

@Controller()
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  /** Revisor/Admin solicita la inspección de alineación territorial. */
  @Post('applications/:id/inspections')
  @Roles('REVISOR', 'ADMIN')
  requestAlineacion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inspections.requestAlineacion(user, id);
  }

  /** El solicitante pide la inspección de recepción de obra (post-licencia). */
  @Post('applications/:id/request-recepcion')
  @Roles('SOLICITANTE')
  requestRecepcion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inspections.requestRecepcion(user, id);
  }

  /** Agenda: el inspector ve solicitudes abiertas y las suyas; revisor/admin ven todas. */
  @Get('inspections')
  @Roles('INSPECTOR', 'REVISOR', 'ADMIN')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: InspectionStatus,
  ) {
    return this.inspections.list(user, status);
  }

  @Post('inspections/:id/propose-dates')
  @Roles('INSPECTOR')
  proposeDates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeDatesDto,
  ) {
    return this.inspections.proposeDates(user, id, dto.dates);
  }

  @Post('inspections/:id/confirm-date')
  @Roles('SOLICITANTE')
  confirmDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmDateDto,
  ) {
    return this.inspections.confirmDate(user, id, dto.date);
  }

  /** Resultado de la visita: multipart con campos result/note + foto obligatoria. */
  @Post('inspections/:id/result')
  @Roles('INSPECTOR')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  registerResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectionResultDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (!photo) {
      throw new BadRequestException('La foto de evidencia es obligatoria (campo "photo")');
    }
    return this.inspections.registerResult(user, id, dto, photo);
  }
}
