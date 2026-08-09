import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { RejectDto } from './dto/reject.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { ReviewService } from './review.service';

@Controller('applications')
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  /** Marcar un documento: Conforme / Con observación / Requiere reemplazo. */
  @Post(':id/review-document')
  @Roles('REVISOR', 'ADMIN')
  reviewDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.review.reviewDocument(user, id, dto);
  }

  @Post(':id/send-to-correction')
  @Roles('REVISOR', 'ADMIN')
  sendToCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.review.sendToCorrection(user, id);
  }

  @Post(':id/approve-review')
  @Roles('REVISOR', 'ADMIN')
  approveReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.review.approveReview(user, id);
  }

  @Post(':id/reject')
  @Roles('REVISOR', 'ADMIN')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
  ) {
    return this.review.reject(user, id, dto.dictamen);
  }

  /** Reenvío de correcciones por el solicitante. */
  @Post(':id/resubmit')
  @Roles('SOLICITANTE')
  resubmit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.review.resubmit(user, id);
  }
}
