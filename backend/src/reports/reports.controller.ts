import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Métricas del dashboard administrativo (expedientes, tiempos, observaciones)',
  })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.dashboard(user);
  }
}
