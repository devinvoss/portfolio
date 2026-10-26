import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CommentPage, LikeResult, MovieComment, ReplyPage, SessionUser } from '@portfolio/models';
import { Types } from 'mongoose';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentPageQuery, CreateCommentDto, ReplyPageQuery, UpdateCommentDto } from './comment.dto';
import { CommentsService } from './comments.service';

@Controller()
@UseGuards(ThrottlerGuard)
export class CommentsController {

  constructor(private commentsService: CommentsService) {}

  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('movie/:movieId/comments')
  list(
    @Param('movieId', ParseObjectIdPipe) movieId: Types.ObjectId,
    @Query() query: CommentPageQuery,
    @CurrentUser() user: SessionUser | null
  ): Promise<CommentPage> {
    return this.commentsService.list(movieId, user, query.before);
  }

  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('comments/:id/replies')
  listReplies(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query() query: ReplyPageQuery,
    @CurrentUser() user: SessionUser | null
  ): Promise<ReplyPage> {
    return this.commentsService.listReplies(id, user, query.after);
  }

  @Auth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('movie/:movieId/comments')
  create(
    @Param('movieId', ParseObjectIdPipe) movieId: Types.ObjectId,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: SessionUser
  ): Promise<MovieComment> {
    return this.commentsService.create(movieId, user, dto);
  }

  @Auth()
  @Patch('comments/:id')
  edit(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: SessionUser
  ): Promise<MovieComment> {
    return this.commentsService.edit(id, user, dto.body);
  }

  @Auth()
  @Delete('comments/:id')
  @HttpCode(204)
  remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: SessionUser): Promise<void> {
    return this.commentsService.remove(id, user);
  }

  @Auth()
  @Put('comments/:id/like')
  like(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: SessionUser): Promise<LikeResult> {
    return this.commentsService.like(id, user);
  }

  @Auth()
  @Delete('comments/:id/like')
  unlike(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: SessionUser): Promise<LikeResult> {
    return this.commentsService.unlike(id, user);
  }

  @Auth('admin')
  @Post('comments/:id/ban-author')
  @HttpCode(200)
  banAuthor(@Param('id', ParseObjectIdPipe) id: Types.ObjectId): Promise<{ removedComments: number }> {
    return this.commentsService.banAuthor(id);
  }
}
