import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ApplicationsService } from './applications.service';
import { AssignReviewerDto } from './dto/assign-reviewer.dto';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { ValidateFormDto } from '../content-validation/dto/validate-form.dto';

@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  /** Tipos de licencia activos con requisitos (para el asistente de creación). */
  @Get('license-types')
  listLicenseTypes(@CurrentUser() user: AuthenticatedUser) {
    return this.applications.listLicenseTypes(user.tenantId);
  }

  /** Valida NIT, dirección y RGP sin crear expediente (paso 3). */
  @Post('applications/validate-form')
  @HttpCode(200)
  @Roles('SOLICITANTE')
  validateForm(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: ValidateFormDto,
  ) {
    return this.applications.previewFormValidation(dto);
  }

  @Post('applications')
  @Roles('SOLICITANTE')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApplicationDto) {
    return this.applications.create(user, dto);
  }

  @Get('applications')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListApplicationsDto) {
    return this.applications.list(user, query);
  }

  @Get('applications/:id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.findOne(user, id);
  }

  @Patch('applications/:id')
  @Roles('SOLICITANTE')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applications.update(user, id, dto.formData);
  }

  /** "Verificar antes de enviar": informe de validación sin cambiar el estado. */
  @Post('applications/:id/validate')
  @Roles('SOLICITANTE')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.validate(user, id);
  }

  @Post('applications/:id/submit')
  @Roles('SOLICITANTE')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applications.submit(user, id);
  }

  @Patch('applications/:id/assign')
  @Roles('ADMIN')
  assignReviewer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignReviewerDto,
  ) {
    return this.applications.assignReviewer(user, id, dto.reviewerId);
  }
}
