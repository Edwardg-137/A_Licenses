import { Module } from '@nestjs/common';
import { ContentValidationModule } from '../content-validation/content-validation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';

@Module({
  imports: [NotificationsModule, ContentValidationModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
