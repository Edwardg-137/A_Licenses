import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { LicensesModule } from '../licenses/licenses.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [NotificationsModule, DocumentsModule, LicensesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
