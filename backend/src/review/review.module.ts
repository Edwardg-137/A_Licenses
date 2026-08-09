import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [ApplicationsModule, NotificationsModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
