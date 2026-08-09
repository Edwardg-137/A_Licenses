import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { PaymentsService } from './payments.service';

@Controller('applications')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Monto y desglose de la tasa (propietario o personal municipal). */
  @Get(':id/payment')
  getPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.getPayment(user, id);
  }

  /** Pago en línea simulado (MVP, decisión D-004). */
  @Post(':id/pay-simulated')
  @Roles('SOLICITANTE')
  paySimulated(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.paySimulated(user, id);
  }

  /** Confirmación de la recepción del comprobante por la municipalidad. */
  @Post(':id/confirm-payment')
  @Roles('REVISOR', 'ADMIN')
  confirmPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.confirmPayment(user, id);
  }
}
