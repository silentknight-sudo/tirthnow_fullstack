import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, NoGuests, Public } from '../../../core/auth';
import { CursorQueryDto, type Page } from '../../../core/http';
import { VendorAccessGuard, VendorPermissionRequired } from '../../vendors';
import {
  CreateReviewDto,
  ReplyDto,
  ReviewPageResponse,
  VendorReviewPageResponse,
  ReviewQueryDto,
  ReviewResponse,
  UpdateReviewDto,
  VendorReviewQueryDto,
} from '../dto/reviews.dto';
import { ReviewsService } from '../services/reviews.service';
import { VendorReviewsService } from '../services/vendor-reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @Public()
  @ApiOkResponse({ type: ReviewPageResponse })
  list(@Query() q: ReviewQueryDto): Promise<ReviewPageResponse> {
    return this.reviews.list(q);
  }

  @Get('mine')
  @ApiBearerAuth()
  mine(@CurrentUser() u: AuthPrincipal, @Query() q: CursorQueryDto): Promise<Page<ReviewResponse>> {
    return this.reviews.mine(u, q);
  }

  @Post()
  @ApiBearerAuth()
  @NoGuests()
  @ApiOperation({ summary: 'Review a temple, or a listing/vendor from a completed booking' })
  @ApiOkResponse({ type: ReviewResponse })
  create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateReviewDto): Promise<ReviewResponse> {
    return this.reviews.create(u, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ReviewResponse })
  update(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponse> {
    return this.reviews.update(u, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.reviews.remove(u, id);
  }
}

@ApiTags('vendor · reviews')
@ApiBearerAuth()
@UseGuards(VendorAccessGuard)
@Controller('vendors/:vid/reviews')
export class VendorReviewsController {
  constructor(private readonly vendorReviews: VendorReviewsService) {}

  @Get()
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: VendorReviewPageResponse })
  list(
    @Param('vid', ParseUUIDPipe) vid: string,
    @Query() q: VendorReviewQueryDto,
  ): Promise<Page<ReviewResponse>> {
    return this.vendorReviews.list(vid, q);
  }

  @Post(':id/reply')
  @HttpCode(200)
  @VendorPermissionRequired('reviews.reply')
  @ApiOkResponse({ type: ReviewResponse })
  reply(
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyDto,
  ): Promise<ReviewResponse> {
    return this.vendorReviews.reply(vid, id, dto.reply);
  }
}
