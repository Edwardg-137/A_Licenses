import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [NotificationsModule, DocumentsModule, PaymentsModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
