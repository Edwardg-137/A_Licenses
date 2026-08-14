import { Module } from '@nestjs/common';
import { ContentValidationService } from './content-validation.service';

@Module({
  providers: [ContentValidationService],
  exports: [ContentValidationService],
})
export class ContentValidationModule {}
